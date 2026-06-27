import Complaint from "../models/complaint.model.js";

export const findNearbyComplaints = async (longitude, latitude) => {

 return await Complaint.find({
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [longitude, latitude]
      },
      $maxDistance: 5000
    }
  }
 });

};