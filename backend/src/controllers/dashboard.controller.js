import Complaint from "../models/complaint.model.js";


// ===============================
// Dashboard Cards
// ===============================
export const getDashboardStats = async (req, res) => {
  try {

    const total = await Complaint.countDocuments();

    const pending = await Complaint.countDocuments({
      status: { $ne: "Resolved" }
    });

    const resolved = await Complaint.countDocuments({
      status: "Resolved"
    });

    const highPriority = await Complaint.countDocuments({
      priorityScore: { $gt: 0.7 }
    });

    const escalated = await Complaint.countDocuments({
      escalationLevel: { $gt: 0 }
    });

    res.json({
      total,
      pending,
      resolved,
      highPriority,
      escalated
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error"
    });
  }
};


// ===============================
// Department Chart
// ===============================
export const getDepartmentStats = async (req, res) => {
  try {
    if (req.user.role === "Officer") {

  const stats = await Complaint.aggregate([
    {
      $match: {
        department: req.user.department
      }
    },
    {
      $unwind: "$department"
    },
    {
      $group: {
        _id: "$department",
        count: { $sum: 1 }
      }
    }
  ]);

  return res.json(stats);
}
    const stats = await Complaint.aggregate([
      {
        $unwind: "$department"
      },
      {
        $group: {
          _id: "$department",
          count: { $sum: 1 }
        }
      },
      {
        $sort: {
          count: -1
        }
      }
    ]);

    res.json(stats);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error"
    });
  }
};


// ===============================
// Status Chart
// ===============================
export const getStatusStats = async (req, res) => {
  try {

    const stats = await Complaint.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      },
      {
        $sort: {
          count: -1
        }
      }
    ]);

    res.json(stats);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error"
    });
  }
};


// ===============================
// Officer Performance
// ===============================
export const getOfficerStats = async (req, res) => {
  try {

    const stats = await Complaint.aggregate([
      {
        $group: {
          _id: {
            name: {
              $ifNull: [
                "$officerName",
                "Unassigned"
              ]
            },

            email: {
              $ifNull: [
                "$officerEmail",
                "No Email"
              ]
            }
          },

          totalAssigned: {
            $sum: 1
          },

          resolved: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$status",
                    "Resolved"
                  ]
                },
                1,
                0
              ]
            }
          },

          pending: {
            $sum: {
              $cond: [
                {
                  $ne: [
                    "$status",
                    "Resolved"
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },

      {
        $project: {
          _id: 1,
          totalAssigned: 1,
          resolved: 1,
          pending: 1,

          efficiency: {
            $cond: [
              {
                $eq: [
                  "$totalAssigned",
                  0
                ]
              },
              0,
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          "$resolved",
                          "$totalAssigned"
                        ]
                      },
                      100
                    ]
                  },
                  2
                ]
              }
            ]
          }
        }
      },

      {
        $sort: {
          efficiency: -1
        }
      }
    ]);

    res.json(stats);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error"
    });
  }
};