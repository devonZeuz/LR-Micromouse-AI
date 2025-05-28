import { Maze } from './maze.js';
import { Mouse } from './mouse.js';
import { QLearningAgent } from './ai.js';
import { MazeAnalytics } from './analytics.js';

const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const newMazeBtn = document.getElementById('newMazeBtn');
const playModeBtn = document.getElementById('playModeBtn');
const generationSpan = document.getElementById('generation');
const bestTimeSpan = document.getElementById('bestTime');
const currentTimeSpan = document.getElementById('currentTime');
const scoreboardList = document.getElementById('scoreboardList');
const successfulRunsSpan = document.getElementById('successfulRuns');
const totalStepsSpan = document.getElementById('totalSteps');
const averageStepsSpan = document.getElementById('averageSteps');
const modeIndicator = document.getElementById('modeIndicator');
const currentModeSpan = document.getElementById('currentMode');

const MAZE_SIZE = 31;
const CELL_SIZE = 20;
const ANIMATION_SPEED = 50;
const LEARNING_STEPS_PER_FRAME = 10;
const SUCCESS_PAUSE_DURATION = 1500;
const MAX_SCOREBOARD_ENTRIES = 10;
const PARTICLE_COUNT = 100;

let maze;
let mouse;
let ai;
let analytics;
let generation = 0;
let successfulRuns = 0;
let totalSteps = 0;
let bestTime = Infinity;
let animationInterval;
let isPaused = false;
let successfulRunsData = [];
let mouseName = 'Learner';
let mouseLogo;
let particles = [];
let isPlayMode = false;

// Simplified mouse name system
const mouseNames = ["Baus", "Rekkles", "Nemesis", "Velja", "Crownie"];

const getMouseName = (gen) => {
    return `${mouseNames[gen % mouseNames.length]} v${Math.floor(gen / mouseNames.length) + 1}`;
};

// Preload mouse logo image
const preloadAssets = () => {
    mouseLogo = new Image();
    mouseLogo.src = 'icons/los-ratones-logo.png';
    mouseLogo.onload = () => generateNewMaze();
    mouseLogo.onerror = () => generateNewMaze();
};

// Generate a new maze and reset game state
const generateNewMaze = () => {
    stopAnimation();
    isPlayMode = false;
    updateModeIndicator();

    const mazeWidth = MAZE_SIZE % 2 === 0 ? MAZE_SIZE + 1 : MAZE_SIZE;
    const mazeHeight = MAZE_SIZE % 2 === 0 ? MAZE_SIZE + 1 : MAZE_SIZE;

    canvas.width = mazeWidth * CELL_SIZE;
    canvas.height = mazeHeight * CELL_SIZE;

    maze = new Maze(mazeWidth, mazeHeight, CELL_SIZE);
    maze.generate();
    
    ai = new QLearningAgent(0.2, 0.95, 1.0, 0.995, 0.01);
    mouse = new Mouse(maze, maze.start.x, maze.start.y, mouseLogo);
    analytics = new MazeAnalytics();

    generation = 0;
    successfulRuns = 0;
    totalSteps = 0;
    bestTime = Infinity;
    successfulRunsData = [];
    updateScoreboard();
    updateMetrics();
    updateStats();
    draw();
};

// Reset mouse position and optionally load best AI state
const resetMouseAndAI = (loadBestAI = true) => {
    stopAnimation();
    isPlayMode = false;
    updateModeIndicator();

    if (ai && loadBestAI && successfulRunsData.length > 0) {
        // Load the Q-table from the best successful run
        const bestRun = successfulRunsData[0];
        if (!ai) {
             ai = new QLearningAgent(0.2, 0.95, 1.0, 0.995, 0.1);
        }
        ai.loadQTable(bestRun.qTable);
        mouseName = getMouseName(bestRun.generation);
    } else {
         // Initialize new AI or use current AI
         if (!ai) {
             ai = new QLearningAgent(0.2, 0.95, 1.0, 0.995, 0.1);
         }
         mouseName = 'Learner';
    }
    
    mouse.reset(maze.start.x, maze.start.y);
    updateStats();
    draw();
};

// Start the learning process
const startLearning = () => {
    if (isPaused) return;
    stopAnimation();
    isPlayMode = false;
    updateModeIndicator();
    animationInterval = requestAnimationFrame(gameLoop);
};

// Main game loop for learning mode
const gameLoop = (timestamp) => {
    if (isPaused || isPlayMode) return;

    // Execute multiple AI steps per frame for faster learning
    for (let i = 0; i < LEARNING_STEPS_PER_FRAME; i++) {
        const currentState = ai.getRelativeState(mouse);
        const action = ai.getAction(currentState);
        const nextPosition = mouse.getNextPosition(action);
        const wouldBeValid = maze.isValidPosition(nextPosition.x, nextPosition.y);
        
        // Calculate reward before moving
        const reward = ai.getReward(mouse, action, wouldBeValid);
        
        let nextState;
        if (wouldBeValid) {
            mouse.move(action);
            nextState = ai.getRelativeState(mouse);
        } else {
            nextState = currentState;
        }

        // Learn from this experience
        ai.learn(currentState, action, reward, nextState);
        
        // Update performance tracking
        ai.performanceTracker.addResult(mouse.steps);
        
        // Update learning rate based on performance
        ai.updateLearningRate(generation, ai.performanceTracker);

        // Update current steps display immediately
        currentTimeSpan.textContent = mouse.steps;

        // Check for successful run
        if (mouse.isAtEnd()) {
            handleSuccessfulRun();
            return;
        }
    }

    // Redraw the canvas after executing steps for this frame
    draw();

    // Request the next frame for animation
    animationInterval = requestAnimationFrame(gameLoop);
};

// Handle a successful run to the end of the maze
const handleSuccessfulRun = () => {
    successfulRuns++;
    const currentRunSteps = mouse.steps;
    const currentRunName = mouseName;

    totalSteps += currentRunSteps;
    bestTime = Math.min(bestTime, currentRunSteps);

    // Record analytics and check for optimal solution
    const insights = analytics.recordEpisode(mouse, ai, generation, currentRunSteps, true);
    updateAnalyticsDisplay(insights);

    // Add to scoreboard if in Learning Mode
    if (!isPlayMode) {
        successfulRunsData.push({
            generation: generation,
            name: currentRunName,
            steps: currentRunSteps,
            qTable: ai.getQTableCopy()
        });
        successfulRunsData.sort((a, b) => a.steps - b.steps);
        successfulRunsData = successfulRunsData.slice(0, MAX_SCOREBOARD_ENTRIES);
    }

    updateMetrics();
    updateStats();
    updateScoreboard();
    
    drawMouseAfterSuccess();
    startParticleAnimation(mouse.x, mouse.y);
    isPaused = true;
    stopAnimation();
    
    // Check if maze is solved optimally
    if (insights.mazeSolved) {
        celebrateOptimalSolution(insights.optimalSteps);
        return;
    }
    
    setTimeout(() => {
        isPaused = false;
        generation++;
        ai.decayExploration();
        mouseName = getMouseName(generation);
        mouse.reset(maze.start.x, maze.start.y);
        startLearning();
    }, SUCCESS_PAUSE_DURATION);
};

// Add celebration and progression function
const celebrateOptimalSolution = (optimalSteps) => {
    // Create celebration overlay
    const overlay = document.createElement('div');
    overlay.className = 'celebration-overlay';
    overlay.innerHTML = `
        <div class="celebration-content">
            <h2>🎉 Maze Solved Optimally! 🎉</h2>
            <p>Optimal Path Found: ${optimalSteps} steps</p>
            <p>Total Generations: ${generation}</p>
            <div class="celebration-buttons">
                <button class="btn btn-primary" id="nextMazeBtn">Try New Maze</button>
                <button class="btn btn-secondary" id="keepTrainingBtn">Keep Training</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Add event listeners
    document.getElementById('nextMazeBtn').addEventListener('click', () => {
        document.body.removeChild(overlay);
        // Save the current Q-table before generating new maze
        const currentQTable = ai.getQTableCopy();
        generateNewMaze();
        // Initialize new AI with previous experience
        ai.loadQTable(currentQTable);
        startLearning();
    });

    document.getElementById('keepTrainingBtn').addEventListener('click', () => {
        document.body.removeChild(overlay);
        setTimeout(() => {
            isPaused = false;
            generation++;
            ai.decayExploration();
            mouseName = getMouseName(generation);
            mouse.reset(maze.start.x, maze.start.y);
            startLearning();
        }, 500);
    });
};

// Start particle animation at a given position
const startParticleAnimation = (x, y) => {
    particles = [];
    // Calculate canvas coordinates from maze grid coordinates
    const startX = x * CELL_SIZE + CELL_SIZE / 2;
    const startY = y * CELL_SIZE + CELL_SIZE / 2;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle(startX, startY));
    }
    // Ensure draw loop is running to animate particles
     if (!animationInterval) {
         requestAnimationFrame(draw);
     }
};

// Simple Particle class for animation effects
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 10 + 5;
        this.color = Math.random() < 0.5 ? '#ffffff' : '#000000';
        this.velocity = {
            x: (Math.random() - 0.5) * 1,
            y: (Math.random() - 0.5) * 1
        };
        this.alpha = 1;
        this.decay = Math.random() * 0.01 + 0.005;
    }

    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.alpha -= this.decay;
        this.velocity.x *= 0.98;
        this.velocity.y *= 0.98;
    }

    draw(ctx) {
        if (this.alpha > 0) {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

// Stop the animation frame loop
const stopAnimation = () => {
    if (animationInterval) {
        cancelAnimationFrame(animationInterval);
        animationInterval = null;
    }
};

// Ensure mouse final position is drawn after success
const drawMouseAfterSuccess = () => {
    draw();
};

// Main drawing function
const draw = () => {
    // Only clear and redraw if not paused (particles still animate when paused)
    if (!isPaused) {
        ctx.fillStyle = '#000000'; // Black background for canvas
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        maze.draw(ctx);
        mouse.draw(ctx, mouseLogo);
    }

    // Draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw(ctx);
        if (particles[i].alpha <= 0) {
            particles.splice(i, 1);
        }
    }

    // Continue animation if there are particles or if not paused and in gameLoop
    if (particles.length > 0 || isPaused || (!animationInterval && !isPlayMode)) {
         requestAnimationFrame(draw);
    }
};

// Update statistics displayed on the page
const updateStats = () => {
    generationSpan.textContent = generation;
    bestTimeSpan.textContent = bestTime === Infinity ? '-' : bestTime;
    currentTimeSpan.textContent = mouse.steps;
};

// Update metrics displayed on the page
const updateMetrics = () => {
    successfulRunsSpan.textContent = successfulRuns;
    totalStepsSpan.textContent = totalSteps;
    averageStepsSpan.textContent = successfulRuns > 0 ? Math.round(totalSteps / successfulRuns) : 0;
    
    // Add performance metrics
    const avgPerformance = ai ? ai.performanceTracker.getAveragePerformance() : 0;
    const performanceElement = document.getElementById('performance');
    if (performanceElement) {
        performanceElement.textContent = `Avg Steps (last 100): ${Math.round(avgPerformance)}`;
    }
};

// Update the scoreboard list
const updateScoreboard = () => {
    scoreboardList.innerHTML = ''; // Clear current list
    // Add each successful run to the list
    successfulRunsData.forEach(run => {
        const li = document.createElement('li');
        li.innerHTML = `Gen ${run.generation}: ${run.name} - ${run.steps} steps`;
        scoreboardList.appendChild(li);
    });
};

// Update the mode indicator (Learning/Play)
const updateModeIndicator = () => {
    modeIndicator.textContent = `Mode: ${isPlayMode ? 'Play' : 'Learning'}`;
};

// Event Listeners for buttons
startBtn.addEventListener('click', startLearning);

resetBtn.addEventListener('click', () => {
    // Reset mouse and load best AI on reset
    resetMouseAndAI(true);
});

newMazeBtn.addEventListener('click', () => {
    // Generate a completely new maze and reset everything
    generateNewMaze();
});

playModeBtn.addEventListener('click', () => {
    stopAnimation(); // Stop learning animation
    isPlayMode = true;
    mouse.reset(maze.start.x, maze.start.y); // Reset mouse for play mode
    updateModeIndicator();
    updateStats();
    draw();
});

// Add save/load button listeners
const saveBtn = document.getElementById('saveBtn');
const loadBtn = document.getElementById('loadBtn');

saveBtn.addEventListener('click', () => {
    if (ai.saveQTable()) {
        // Visual feedback for successful save
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '✅ Saved!';
        saveBtn.style.backgroundColor = '#4CAF50';
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.style.backgroundColor = '';
        }, 2000);
    }
});

loadBtn.addEventListener('click', () => {
    if (ai.loadQTableFromStorage()) {
        // Visual feedback for successful load
        const originalText = loadBtn.textContent;
        loadBtn.textContent = '✅ Loaded!';
        loadBtn.style.backgroundColor = '#4CAF50';
        setTimeout(() => {
            loadBtn.textContent = originalText;
            loadBtn.style.backgroundColor = '';
        }, 2000);
        
        // Reset mouse but keep the loaded AI
        resetMouseAndAI(false);
    }
});

// Keyboard controls for Play Mode
document.addEventListener('keydown', (event) => {
    // Only respond in play mode and when not paused
    if (!isPlayMode || isPaused) return;

    // Prevent default scrolling for arrow keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
    }

    let action = -1;

    switch (event.key) {
        case 'ArrowUp':
            action = 3; // Up
            break;
        case 'ArrowRight':
            action = 0; // Right
            break;
        case 'ArrowDown':
            action = 1; // Down
            break;
        case 'ArrowLeft':
            action = 2; // Left
            break;
    }

    if (action !== -1) {
        const nextPosition = mouse.getNextPosition(action);
        if (maze.isValidPosition(nextPosition.x, nextPosition.y)) {
            mouse.move(action);
            // Update stats and draw after a valid player move
            updateStats();
            draw();

            // Check for end reached in Play Mode
            if (mouse.isAtEnd()) {
                handleSuccessfulRun(); // Use the same success handler
            }
        }
    }
});

// Add analytics display functions
const updateAnalyticsDisplay = (insights) => {
    const analyticsDiv = document.getElementById('analytics') || createAnalyticsPanel();
    
    const progressHTML = `
        <div class="analytics-section">
            <h3>Learning Progress</h3>
            <p>Status: ${insights.learningProgress.status}</p>
            <p>Trend: ${insights.learningProgress.trend} (${insights.learningProgress.improvement}%)</p>
        </div>
    `;

    const behaviorHTML = `
        <div class="analytics-section">
            <h3>Behavior Analysis</h3>
            <p>Strategy: ${insights.behaviorAnalysis.dominantStrategy}</p>
            <p>Path Efficiency: ${Math.round(insights.behaviorAnalysis.efficiency * 100)}%</p>
            <p>Exploration Rate: ${Math.round(insights.behaviorAnalysis.explorationRate * 100)}%</p>
        </div>
    `;

    const metricsHTML = insights.performanceMetrics ? `
        <div class="analytics-section">
            <h3>Performance</h3>
            <p>Average Steps: ${insights.performanceMetrics.averageSteps}</p>
            <p>Success Rate: ${Math.round(insights.performanceMetrics.successRate)}%</p>
            <p>Coverage: ${insights.performanceMetrics.averageUniqueCells} cells</p>
        </div>
    ` : '';

    const recommendationsHTML = insights.recommendations.length ? `
        <div class="analytics-section">
            <h3>Recommendations</h3>
            <ul>
                ${insights.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    ` : '';

    analyticsDiv.innerHTML = progressHTML + behaviorHTML + metricsHTML + recommendationsHTML;
};

const createAnalyticsPanel = () => {
    const analyticsDiv = document.createElement('div');
    analyticsDiv.id = 'analytics';
    analyticsDiv.className = 'analytics-panel';
    
    // Insert after the scoreboard
    const scoreboard = document.querySelector('.scoreboard');
    scoreboard.parentNode.insertBefore(analyticsDiv, scoreboard.nextSibling);
    
    return analyticsDiv;
};

// Initial setup: preload assets and start
preloadAssets();