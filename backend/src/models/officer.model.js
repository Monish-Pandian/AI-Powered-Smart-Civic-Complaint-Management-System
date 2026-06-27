import mongoose from "mongoose";

const officerSchema = new mongoose.Schema({
  name: String,
  email: String,
  department: String,
  level: {
  type: Number,
  required: true,
  min: 1, 
  default: 1
},
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: [Number] // [longitude, latitude]
  }

});

officerSchema.index({ location: "2dsphere" }); 

export default mongoose.model("Officer", officerSchema);