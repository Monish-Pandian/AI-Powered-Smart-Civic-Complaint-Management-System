export default function StatCard({ title, value, color }) {
  return (
    <div
      className="glass p-4 text-white hover-lift"
      style={{
        background: `linear-gradient(135deg, ${color[0]}, ${color[1]})`,
        borderRadius: "16px"
      }}
    >
      <h6>{title}</h6>
      <h2 className="fw-bold">{value}</h2>
    </div>
  );
}