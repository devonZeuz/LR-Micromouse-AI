export class QLearningAgent {
    /**
     * @param {number} learningRate - The learning rate (alpha) determines how much new information overrides old information. (0-1)
     * @param {number} discountFactor - The discount factor (gamma) determines the importance of future rewards. (0-1)
     * @param {number} explorationRate - The initial exploration rate (epsilon) determines the probability of taking a random action.
     * @param {number} explorationDecay - The rate at which the exploration rate decays over generations.
     * @param {number} minExplorationRate - The minimum exploration rate to prevent exploration from dropping to zero.
     */
    constructor(learningRate = 0.1, discountFactor = 0.9, explorationRate = 1.0, explorationDecay = 0.995, minExplorationRate = 0.01) {
        this.learningRate = learningRate;
        this.discountFactor = discountFactor;
        this.explorationRate = explorationRate;
        this.explorationDecay = explorationDecay;
        this.minExplorationRate = minExplorationRate;
        this.qTable = new Map(); 
    }

    /**
     * @param {string} state - The string representation of the current state.
     * @returns {number} The chosen action (0: right, 1: down, 2: left, 3: up).
     */
    getAction(state) {
        // Exploration vs Exploitation
        if (Math.random() < this.explorationRate) {
            return Math.floor(Math.random() * 4); // Explore: random action
        }

        const stateKey = state;
        if (!this.qTable.has(stateKey)) {
            this.qTable.set(stateKey, [0, 0, 0, 0]);
        }
        const qValues = this.qTable.get(stateKey);
        
        // Exploit: find best action (handle ties)
        const maxQ = Math.max(...qValues);
        const actionsWithMaxQ = qValues
            .map((value, index) => (value === maxQ ? index : -1))
            .filter(index => index !== -1);
            
        return actionsWithMaxQ[Math.floor(Math.random() * actionsWithMaxQ.length)];
    }

    /**
     * Performs the Q-learning update based on a taken action and received reward.
     * @param {string} state - The string representation of the state before the action.
     * @param {number} action - The action taken from the state.
     * @param {number} reward - The reward received after taking the action.
     * @param {string} nextState - The string representation of the state after the action.
     */
    learn(state, action, reward, nextState) {
        const stateKey = state;
        const nextStateKey = nextState;

        if (!this.qTable.has(stateKey)) {
            this.qTable.set(stateKey, [0, 0, 0, 0]);
        }
        if (!this.qTable.has(nextStateKey)) {
            this.qTable.set(nextStateKey, [0, 0, 0, 0]);
        }

        // Q-learning update
        const currentQ = this.qTable.get(stateKey)[action];
        const nextMaxQ = Math.max(...this.qTable.get(nextStateKey));
        const newQ = currentQ + this.learningRate * (reward + this.discountFactor * nextMaxQ - currentQ);
        
        this.qTable.get(stateKey)[action] = newQ;
    }

    /**
     * Calculates the reward for a given action based on the mouse's position and the maze state.
     * (Note: This reward function is used in main.js, not directly in the learn method here).
     * @param {Mouse} mouse - The mouse object.
     * @param {number} action - The action taken.
     * @returns {number} The calculated reward.
     */
    getReward(mouse, action) {
        const nextPosition = mouse.getNextPosition(action);

        // Penalty for hitting a wall
        const dx = [1, 0, -1, 0][action];
        const dy = [0, 1, 0, -1][action];
        if (mouse.maze.isWall(mouse.x + dx, mouse.y + dy)) {
            return -10;
        }

        // Reward/penalty based on distance to goal
        const currentDist = Math.abs(mouse.x - mouse.maze.end.x) + Math.abs(mouse.y - mouse.maze.end.y);
        const nextDist = Math.abs(nextPosition.x - mouse.maze.end.x) + Math.abs(nextPosition.y - mouse.maze.end.y);
        
        let reward = 0;
        if (nextDist < currentDist) {
            reward += 1;
        } else if (nextDist > currentDist) {
            reward -= 1;
        }

        // Small penalty per step
        reward -= 0.1;

        // Bonus for exploring new cells
        const newPosKey = `${nextPosition.x},${nextPosition.y}`;
        if (mouse.maze.isValidPosition(nextPosition.x, nextPosition.y) && !mouse.visited.has(newPosKey)) {
             reward += 2;
        }

         return reward;
    }

    /**
     * Decays the exploration rate (epsilon) over time, typically after each episode or successful run.
     */
    decayExploration() {
        this.explorationRate = Math.max(this.minExplorationRate, this.explorationRate * this.explorationDecay);
    }

    /**
     * Returns a deep copy of the Q-table.
     * @returns {Map<string, number[]>} A copy of the Q-table.
     */
    getQTableCopy() {
        const qTableCopy = new Map();
        this.qTable.forEach((value, key) => {
            qTableCopy.set(key, [...value]);
        });
        return qTableCopy;
    }

    /**
     * Loads a provided Q-table into the agent.
     * @param {Map<string, number[]>} qTable - The Q-table to load.
     */
    loadQTable(qTable) {
        this.qTable = new Map(qTable);
    }

     // Potential method to save Q-table (e.g., to localStorage) - currently not implemented
     // saveQTable() { /* ... */ }
} 