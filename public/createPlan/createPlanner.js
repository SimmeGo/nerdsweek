import { createPlayGenerator } from "./createPlayGenerator.js";
import { assignPlaysToTimeslot } from "./playAssignment.js";
import { calculateAverage } from "../shared/forms.js";

export function createPlanner({ players, games, TIMESLOTS, calculateSatisfactionScore }) {


    const playGenerator = createPlayGenerator({ games, players });
    
    async function generateAndCyclePlans(cycleCount, showProgress) {
        let bestPlan = null;
        let isNewPlan = false;
    
        for (let cycleNumber = 0; cycleNumber < cycleCount; cycleNumber++) {
            const currentPlan = generatePlan();
    
            bestPlan = analysePlan(currentPlan, bestPlan, cycleNumber);
    
            if (!isNewPlan) isNewPlan = bestPlan === currentPlan;
    
            if ((cycleNumber + 1) % 10 === 0 || cycleNumber + 1 === cycleCount) {
                showProgress(cycleNumber + 1, cycleCount, bestPlan, isNewPlan);
                isNewPlan = false;

                await new Promise(resolve => setTimeout(resolve, 0));
            };
            if (cycleNumber + 1 === cycleCount) console.log(cycleNumber + 1);
        };
        showProgress(100, 100, bestPlan, isNewPlan);

        return bestPlan;
    }
    
    function analysePlan(currentPlan, bestPlan, i) {
        if (!bestPlan) {
            bestPlan = currentPlan;
            reportInbetweenResult(bestPlan, i);
        } else if (comparePlans(bestPlan, currentPlan)) {
            bestPlan = currentPlan;
            reportInbetweenResult(bestPlan, i);
        };
        return bestPlan;
    }
    
    function comparePlans(oldPlan, newPlan) {
        let comparisonScore = 0;
        for (const [playerId, satisfactionScore] of Object.entries(oldPlan.playerSatisfaction)) {
            const thisPlayersNewSatisfaction = newPlan.playerSatisfaction[playerId];
            if (thisPlayersNewSatisfaction >= satisfactionScore) comparisonScore += 1;
        }
        if (Math.min(...Object.values(newPlan.playerSatisfaction)) <= Math.min(...Object.values(oldPlan.playerSatisfaction))) return false;
        console.log(`Insgesamt haben ${comparisonScore} Spieler bei diesem Plan einen besseren Zufriedenheitswert.`);
        
        return true;
    }
    
    function reportInbetweenResult(bestPlan, i) {
        console.log(
            `Durchlauf ${i}:`,
            Math.round(bestPlan.averageSatisfaction),
            bestPlan.playerSatisfaction
        );
    }
    
    function generatePlan() {
        const plays = playGenerator.generatePlays();
        assignPlaysToTimeslot({ plays, players, games, TIMESLOTS });
    
        const plan = {
            plays: plays,
            playerSatisfaction: calculateSatisfactionScore(plays),
        };
    
        plan.averageSatisfaction = calculateAverage(Object.values(plan.playerSatisfaction));
        return plan;
    }

    return { generateAndCyclePlans };
}