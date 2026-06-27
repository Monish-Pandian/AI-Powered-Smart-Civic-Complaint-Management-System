import cron from "node-cron";
import { checkEscalations } from "../services/escalation.service.js";

cron.schedule("*/10 * * * *", async () => {
 console.log("Running escalation check...");
 await checkEscalations();
});