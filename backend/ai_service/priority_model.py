"""
priority_model.py
=================
Regression-based Priority Detector for the Smart Complaint Management System.

Instead of classifying complaints into discrete labels (Low / Medium / High / Critical),
this module trains a regression model that predicts a **continuous priority score**
in the range [0.0, 1.0].  The score is later converted to a badge by the frontend.

Pipeline
--------
    Raw complaint text
        → TF-IDF Vectorizer  (sparse matrix)
        → GradientBoostingRegressor

    Note on regressor choice
    ------------------------
    GradientBoostingRegressor in scikit-learn operates on dense numpy arrays
    internally.  For very high-dimensional TF-IDF matrices this can be slow and
    memory-hungry, but for typical complaint datasets (< 50 k rows, < 20 k vocab)
    it works well in practice.  If the vocabulary size exceeds the threshold
    MAX_FEATURES defined below, the pipeline automatically falls back to
    RandomForestRegressor, which handles sparse inputs natively via its Cython
    tree implementation and is therefore a safer choice for large vocabularies.

Usage
-----
    from priority_model import PriorityDetector

    detector = PriorityDetector()
    score = detector.predict("Gas leak inside apartment")   # → 0.97
    scores = detector.predict_batch(["Gas leak", "Park bench broken"])  # → [0.97, 0.21]

Author : Smart Complaint Management System team
License: MIT
"""

from __future__ import annotations

import logging
import math
import os
from pathlib import Path
from typing import List, Optional

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline

# ---------------------------------------------------------------------------
# Logging configuration
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)s]  %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("priority_model")

# ---------------------------------------------------------------------------
# Path constants  (resolved relative to this file so the module is portable)
# ---------------------------------------------------------------------------
_MODULE_DIR: Path = Path(__file__).resolve().parent
DATA_PATH: Path = _MODULE_DIR / "data" / "priority_training.csv"
MODEL_PATH: Path = _MODULE_DIR / "models" / "priority_model.pkl"

# ---------------------------------------------------------------------------
# Hyper-parameters
# ---------------------------------------------------------------------------
TFIDF_MAX_FEATURES: int = 5_000        # cap vocabulary size
TFIDF_NGRAM_RANGE: tuple = (1, 2)     # unigrams + bigrams
TEST_SIZE: float = 0.20                # 80/20 train-test split
RANDOM_STATE: int = 42
CV_FOLDS: int = 5                      # k-fold cross-validation
GB_N_ESTIMATORS: int = 300
GB_LEARNING_RATE: float = 0.05
GB_MAX_DEPTH: int = 4
GB_SUBSAMPLE: float = 0.8
RF_N_ESTIMATORS: int = 300
RF_MAX_DEPTH: Optional[int] = None

# Vocabulary size above which we switch from GBR → RF for memory/speed safety.
# GradientBoostingRegressor converts sparse matrices to dense arrays; above this
# threshold the memory footprint becomes impractical on typical servers.
SPARSE_SWITCH_THRESHOLD: int = 3_000


# ---------------------------------------------------------------------------
# PriorityDetector
# ---------------------------------------------------------------------------
class PriorityDetector:
    """
    Regression model that maps a free-text complaint to a priority score
    in [0.0, 1.0].

    Attributes
    ----------
    pipeline : sklearn.pipeline.Pipeline or None
        The trained TF-IDF → regressor pipeline.  None until trained / loaded.
    model_path : Path
        Where the serialised pipeline is stored / loaded from.
    data_path : Path
        Path to the CSV training data file.
    """

    # ------------------------------------------------------------------
    # Construction
    # ------------------------------------------------------------------
    def __init__(
        self,
        model_path: Path = MODEL_PATH,
        data_path: Path = DATA_PATH,
    ) -> None:
        """
        Initialise the detector.

        If a serialised model already exists at *model_path* it is loaded
        immediately; otherwise :py:meth:`train` must be called explicitly
        (or the :py:meth:`__main__` block will do it automatically).

        Parameters
        ----------
        model_path:
            Filesystem path where the trained pipeline is persisted.
        data_path:
            Filesystem path of the CSV training file
            (columns: ``complaint``, ``priority``).
        """
        self.model_path: Path = Path(model_path)
        self.data_path: Path = Path(data_path)
        self.pipeline: Optional[Pipeline] = None

        if self.model_path.exists():
            logger.info("Existing model found — loading from %s", self.model_path)
            self.load()
        else:
            logger.info(
                "No saved model found at %s — call train() to build one.",
                self.model_path,
            )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _load_data(self) -> tuple[List[str], List[float]]:
        """
        Read and validate the training CSV.

        Returns
        -------
        complaints : list[str]
            Raw complaint texts.
        scores : list[float]
            Corresponding priority scores in [0.0, 1.0].

        Raises
        ------
        FileNotFoundError
            If the CSV does not exist at ``self.data_path``.
        ValueError
            If required columns are missing or scores are out of range.
        """
        if not self.data_path.exists():
            raise FileNotFoundError(
                f"Training data not found at {self.data_path}. "
                "Please place priority_training.csv inside the data/ folder."
            )

        logger.info("Loading training data from %s", self.data_path)
        df = pd.read_csv(self.data_path)

        # --- Column validation ---
        required_columns = {"complaint", "priority"}
        missing = required_columns - set(df.columns.str.strip().str.lower())
        if missing:
            raise ValueError(
                f"CSV is missing required column(s): {missing}. "
                f"Found columns: {list(df.columns)}"
            )

        # Normalise column names to lowercase
        df.columns = df.columns.str.strip().str.lower()

        # --- Drop nulls ---
        original_len = len(df)
        df.dropna(subset=["complaint", "priority"], inplace=True)
        if len(df) < original_len:
            logger.warning(
                "Dropped %d row(s) with null values.", original_len - len(df)
            )

        # --- Range validation ---
        out_of_range = df[(df["priority"] < 0.0) | (df["priority"] > 1.0)]
        if not out_of_range.empty:
            logger.warning(
                "%d row(s) have priority scores outside [0, 1] — they will be clipped.",
                len(out_of_range),
            )
            df["priority"] = df["priority"].clip(0.0, 1.0)

        logger.info("Loaded %d training samples.", len(df))
        return df["complaint"].tolist(), df["priority"].tolist()

    def _build_pipeline(self, vocab_size: int) -> Pipeline:
        """
        Construct the sklearn Pipeline based on estimated vocabulary size.

        Parameters
        ----------
        vocab_size:
            Number of TF-IDF features after fitting (estimated from data).

        Returns
        -------
        pipeline : Pipeline
            Un-fitted TF-IDF → regressor pipeline.

        Notes
        -----
        *   If ``vocab_size`` ≤ ``SPARSE_SWITCH_THRESHOLD`` we use
            **GradientBoostingRegressor**.  Despite converting sparse matrices
            to dense internally, the memory cost is acceptable at this scale,
            and boosting typically yields the best accuracy on small datasets.

        *   If ``vocab_size`` > ``SPARSE_SWITCH_THRESHOLD`` we fall back to
            **RandomForestRegressor**, which accepts scipy sparse matrices
            directly, avoids the density conversion overhead, and remains
            robust on high-dimensional text features.
        """
        tfidf = TfidfVectorizer(
            max_features=TFIDF_MAX_FEATURES,
            ngram_range=TFIDF_NGRAM_RANGE,
            sublinear_tf=True,   # apply log(1 + tf) to smooth term frequencies
            strip_accents="unicode",
            analyzer="word",
            token_pattern=r"\b[a-zA-Z][a-zA-Z0-9]*\b",
            min_df=1,
        )

        if vocab_size <= SPARSE_SWITCH_THRESHOLD:
            logger.info(
                "Vocabulary size (%d) is within threshold — using GradientBoostingRegressor.",
                vocab_size,
            )
            regressor = GradientBoostingRegressor(
                n_estimators=GB_N_ESTIMATORS,
                learning_rate=GB_LEARNING_RATE,
                max_depth=GB_MAX_DEPTH,
                subsample=GB_SUBSAMPLE,
                random_state=RANDOM_STATE,
                loss="squared_error",
            )
        else:
            # Reason: GradientBoostingRegressor materialises the sparse TF-IDF
            # matrix as a dense numpy array (via .toarray()), which at tens-of-
            # thousands of features blows up RAM usage.  RandomForestRegressor
            # uses Cython code that traverses the sparse matrix directly, so it
            # stays efficient regardless of vocabulary size.
            logger.info(
                "Vocabulary size (%d) exceeds threshold %d — "
                "switching to RandomForestRegressor for sparse-matrix efficiency.",
                vocab_size,
                SPARSE_SWITCH_THRESHOLD,
            )
            regressor = RandomForestRegressor(
                n_estimators=RF_N_ESTIMATORS,
                max_depth=RF_MAX_DEPTH,
                random_state=RANDOM_STATE,
                n_jobs=-1,
            )

        return Pipeline(steps=[("tfidf", tfidf), ("regressor", regressor)])

    @staticmethod
    def _compute_metrics(
        y_true: List[float],
        y_pred: List[float],
        label: str = "Evaluation",
    ) -> dict:
        """
        Compute regression evaluation metrics and log them.

        Parameters
        ----------
        y_true:
            Ground-truth priority scores.
        y_pred:
            Predicted priority scores.
        label:
            Prefix string for log output.

        Returns
        -------
        metrics : dict
            Dictionary with keys ``mae``, ``rmse``, ``r2``.
        """
        mae = mean_absolute_error(y_true, y_pred)
        rmse = math.sqrt(mean_squared_error(y_true, y_pred))
        r2 = r2_score(y_true, y_pred)

        logger.info(
            "%s → MAE: %.4f | RMSE: %.4f | R²: %.4f",
            label,
            mae,
            rmse,
            r2,
        )
        return {"mae": mae, "rmse": rmse, "r2": r2}

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def train(self) -> "PriorityDetector":
        """
        Train the regression pipeline on the CSV dataset.

        Steps
        -----
        1.  Load and validate data from ``self.data_path``.
        2.  Split into train / test sets (80 / 20).
        3.  Determine estimated vocabulary size to choose the regressor.
        4.  Fit the TF-IDF → regressor pipeline on the training set.
        5.  Evaluate on the held-out test set.
        6.  Persist the model via :py:meth:`save`.

        Returns
        -------
        self : PriorityDetector
            Enables method chaining.
        """
        complaints, scores = self._load_data()

        X_train, X_test, y_train, y_test = train_test_split(
            complaints,
            scores,
            test_size=TEST_SIZE,
            random_state=RANDOM_STATE,
        )
        logger.info(
            "Train / test split — train: %d, test: %d", len(X_train), len(X_test)
        )

        # Estimate vocabulary size from training corpus to decide the regressor.
        # We fit a temporary TF-IDF (same settings) just to count features.
        _probe = TfidfVectorizer(
            max_features=TFIDF_MAX_FEATURES,
            ngram_range=TFIDF_NGRAM_RANGE,
        )
        _probe.fit(X_train)
        estimated_vocab: int = len(_probe.vocabulary_)
        logger.info("Estimated TF-IDF vocabulary size: %d", estimated_vocab)
        del _probe   # free memory

        self.pipeline = self._build_pipeline(estimated_vocab)

        logger.info("Fitting pipeline…")
        self.pipeline.fit(X_train, y_train)
        logger.info("Training complete.")

        # Evaluate on held-out test set
        y_pred: np.ndarray = self.pipeline.predict(X_test)
        y_pred_clipped = np.clip(y_pred, 0.0, 1.0)
        self._compute_metrics(y_test, y_pred_clipped.tolist(), label="Test-set")

        self.save()
        return self

    def evaluate(self) -> dict:
        """
        Evaluate the trained model on a fresh 20 % hold-out drawn from the
        full dataset.

        Returns
        -------
        metrics : dict
            Keys: ``mae``, ``rmse``, ``r2``.

        Raises
        ------
        RuntimeError
            If the model has not been trained or loaded yet.
        """
        self._require_trained()
        complaints, scores = self._load_data()

        _, X_eval, _, y_eval = train_test_split(
            complaints,
            scores,
            test_size=TEST_SIZE,
            random_state=RANDOM_STATE,
        )

        y_pred = np.clip(self.pipeline.predict(X_eval), 0.0, 1.0)
        return self._compute_metrics(y_eval, y_pred.tolist(), label="Evaluate")

    def cross_validate(self) -> dict:
        """
        Perform ``CV_FOLDS``-fold cross-validation on the full dataset and
        report mean ± std of MAE, RMSE, and R².

        Returns
        -------
        cv_results : dict
            Keys: ``mae_mean``, ``mae_std``, ``rmse_mean``, ``rmse_std``,
            ``r2_mean``, ``r2_std``.

        Raises
        ------
        RuntimeError
            If the model has not been trained or loaded yet.
        """
        self._require_trained()
        complaints, scores = self._load_data()

        kf = KFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)

        mae_scores: List[float] = []
        rmse_scores: List[float] = []
        r2_scores: List[float] = []

        logger.info("Starting %d-fold cross-validation…", CV_FOLDS)

        # We re-use the same pipeline architecture but fit fresh clones per fold.
        # scikit-learn's cross_val_score would clone the pipeline, but we want
        # per-fold RMSE which is not a built-in scorer, so we loop manually.
        for fold_idx, (train_idx, val_idx) in enumerate(
            kf.split(complaints), start=1
        ):
            X_tr = [complaints[i] for i in train_idx]
            X_vl = [complaints[i] for i in val_idx]
            y_tr = [scores[i] for i in train_idx]
            y_vl = [scores[i] for i in val_idx]

            # Build a fresh (un-fitted) pipeline for this fold
            _probe = TfidfVectorizer(
                max_features=TFIDF_MAX_FEATURES, ngram_range=TFIDF_NGRAM_RANGE
            )
            _probe.fit(X_tr)
            fold_vocab = len(_probe.vocabulary_)
            del _probe

            fold_pipeline = self._build_pipeline(fold_vocab)
            fold_pipeline.fit(X_tr, y_tr)

            y_pred = np.clip(fold_pipeline.predict(X_vl), 0.0, 1.0)

            mae = mean_absolute_error(y_vl, y_pred)
            rmse = math.sqrt(mean_squared_error(y_vl, y_pred))
            r2 = r2_score(y_vl, y_pred)

            mae_scores.append(mae)
            rmse_scores.append(rmse)
            r2_scores.append(r2)

            logger.info(
                "  Fold %d/%d → MAE: %.4f | RMSE: %.4f | R²: %.4f",
                fold_idx,
                CV_FOLDS,
                mae,
                rmse,
                r2,
            )

        cv_results = {
            "mae_mean": float(np.mean(mae_scores)),
            "mae_std": float(np.std(mae_scores)),
            "rmse_mean": float(np.mean(rmse_scores)),
            "rmse_std": float(np.std(rmse_scores)),
            "r2_mean": float(np.mean(r2_scores)),
            "r2_std": float(np.std(r2_scores)),
        }

        logger.info(
            "Cross-validation summary (%d folds) — "
            "MAE: %.4f ± %.4f | RMSE: %.4f ± %.4f | R²: %.4f ± %.4f",
            CV_FOLDS,
            cv_results["mae_mean"],
            cv_results["mae_std"],
            cv_results["rmse_mean"],
            cv_results["rmse_std"],
            cv_results["r2_mean"],
            cv_results["r2_std"],
        )

        return cv_results

    def predict(self, complaint: str) -> float:
        """
        Predict the priority score for a single complaint.

        Parameters
        ----------
        complaint:
            Free-text description of the complaint.

        Returns
        -------
        score : float
            Priority score in [0.0, 1.0], rounded to two decimal places.
            Example: ``0.87``

        Raises
        ------
        RuntimeError
            If the model has not been trained or loaded yet.
        ValueError
            If *complaint* is an empty string.
        """
        self._require_trained()

        if not complaint or not complaint.strip():
            raise ValueError("Complaint text must be a non-empty string.")

        raw_score: float = self.pipeline.predict([complaint])[0]
        clipped: float = float(np.clip(raw_score, 0.0, 1.0))
        return round(clipped, 2)

    def predict_batch(self, complaints: List[str]) -> List[float]:
        """
        Predict priority scores for a list of complaints in one pass.

        Parameters
        ----------
        complaints:
            List of complaint strings.

        Returns
        -------
        scores : list[float]
            Priority scores rounded to two decimal places, e.g. ``[0.91, 0.72, 0.31]``.

        Raises
        ------
        RuntimeError
            If the model has not been trained or loaded yet.
        ValueError
            If *complaints* is empty.
        """
        self._require_trained()

        if not complaints:
            raise ValueError("The complaints list must not be empty.")

        raw: np.ndarray = self.pipeline.predict(complaints)
        clipped: np.ndarray = np.clip(raw, 0.0, 1.0)
        return [round(float(s), 2) for s in clipped]

    def save(self, path: Optional[Path] = None) -> None:
        """
        Serialise the trained pipeline to disk using joblib.

        Parameters
        ----------
        path:
            Override save location.  Defaults to ``self.model_path``.

        Raises
        ------
        RuntimeError
            If the model has not been trained yet.
        """
        self._require_trained()

        target: Path = Path(path) if path else self.model_path
        target.parent.mkdir(parents=True, exist_ok=True)

        joblib.dump(self.pipeline, target, compress=3)
        logger.info("Model saved to %s", target)

    def load(self, path: Optional[Path] = None) -> "PriorityDetector":
        """
        Load a serialised pipeline from disk.

        Parameters
        ----------
        path:
            Override load location.  Defaults to ``self.model_path``.

        Returns
        -------
        self : PriorityDetector
            Enables method chaining.

        Raises
        ------
        FileNotFoundError
            If no model file exists at the given path.
        """
        source: Path = Path(path) if path else self.model_path

        if not source.exists():
            raise FileNotFoundError(
                f"No model file found at {source}. "
                "Call train() to build and save a model first."
            )

        self.pipeline = joblib.load(source)
        logger.info("Model loaded from %s", source)
        return self

    # ------------------------------------------------------------------
    # Guard
    # ------------------------------------------------------------------
    def _require_trained(self) -> None:
        """
        Assert that the pipeline is ready for inference.

        Raises
        ------
        RuntimeError
            If ``self.pipeline`` is None.
        """
        if self.pipeline is None:
            raise RuntimeError(
                "Model is not trained or loaded. "
                "Call train() or load() before using predict / evaluate."
            )

    # ------------------------------------------------------------------
    # Dunder
    # ------------------------------------------------------------------
    def __repr__(self) -> str:
        status = "ready" if self.pipeline is not None else "not trained"
        return (
            f"PriorityDetector("
            f"model_path={self.model_path!r}, "
            f"data_path={self.data_path!r}, "
            f"status={status!r})"
        )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("=" * 65)
    print("  Smart Complaint Management System — Priority Model")
    print("=" * 65)

    detector = PriorityDetector()

    # Train if the model was not auto-loaded at construction time
    if detector.pipeline is None:
        print("\n[1/5] Training model…")
        detector.train()
    else:
        print("\n[1/5] Model already loaded from disk — skipping training.")

    # Evaluate on held-out test slice
    print("\n[2/5] Evaluating on hold-out test set…")
    metrics = detector.evaluate()
    print(
        f"      MAE:  {metrics['mae']:.4f}\n"
        f"      RMSE: {metrics['rmse']:.4f}\n"
        f"      R²:   {metrics['r2']:.4f}"
    )

    # 5-fold cross-validation
    print(f"\n[3/5] Running {CV_FOLDS}-fold cross-validation…")
    cv = detector.cross_validate()
    print(
        f"      MAE:  {cv['mae_mean']:.4f} ± {cv['mae_std']:.4f}\n"
        f"      RMSE: {cv['rmse_mean']:.4f} ± {cv['rmse_std']:.4f}\n"
        f"      R²:   {cv['r2_mean']:.4f} ± {cv['r2_std']:.4f}"
    )

    # Persist model
    print("\n[4/5] Saving model…")
    detector.save()

    # Reload from disk to verify round-trip
    print("\n[5/5] Reloading from disk and running demo predictions…")
    fresh = PriorityDetector()   # auto-loads because file now exists

    demo_complaints = [
        "Gas leak inside apartment building",
        "Transformer explosion on main road",
        "Huge pothole causing accidents on highway",
        "Garbage not collected for 5 days",
        "Park grass not trimmed for weeks",
        "Street light not working near school",
        "Water pipe burst flooding the road",
        "Broken park bench",
    ]

    print("\n  Demo predictions:")
    print(f"  {'Complaint':<50} {'Score':>6}")
    print("  " + "-" * 58)
    for complaint in demo_complaints:
        score = fresh.predict(complaint)
        bar = "█" * int(score * 20)
        print(f"  {complaint:<50} {score:>5.2f}  {bar}")

    print("\n  Batch prediction example:")
    batch_input = [demo_complaints[0], demo_complaints[3], demo_complaints[4]]
    batch_scores = fresh.predict_batch(batch_input)
    for text, score in zip(batch_input, batch_scores):
        print(f"  {score:.2f}  ←  {text}")

    print("\n✓ All steps completed successfully.")
    print(f"  Model stored at: {detector.model_path}")