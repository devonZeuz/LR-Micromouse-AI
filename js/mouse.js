// Class representing the mouse agent in the maze.
export class Mouse {
    /**
     * @param {Maze} maze - The maze object the mouse is in.
     * @param {number} x - The initial x-coordinate of the mouse.
     * @param {number} y - The initial y-coordinate of the mouse.
     * @param {HTMLImageElement} mouseImage - The image element for the mouse.
     */
    constructor(maze, x, y, mouseImage) {
        this.maze = maze;
        this.x = x;
        this.y = y;
        this.cellSize = maze.cellSize;
        this.direction = 0; // 0: right, 1: down, 2: left, 3: up
        this.visited = new Set(); // To keep track of visited cells
        this.path = []; // To store the path taken by the mouse
        this.image = mouseImage;
        this.steps = 0; // Number of steps taken in the current run
    }

    /**
     * Resets the mouse to its starting position and clears run-specific data.
     */
    reset() {
        this.x = this.maze.start.x;
        this.y = this.maze.start.y;
        this.direction = 0;
        this.visited.clear();
        this.path = [];
        this.steps = 0;
    }

    /**
     * Draws the mouse and its path on the canvas.
     * @param {CanvasRenderingContext2D} ctx - The 2D rendering context of the canvas.
     * @param {HTMLImageElement} mouseLogo - The image element for the mouse logo.
     */
    draw(ctx, mouseLogo) {
        // Draw path taken by the mouse
        if (this.path.length > 1) {
            ctx.strokeStyle = '#ccc'; // Path color (light grey)
            ctx.lineWidth = this.cellSize / 4;
            ctx.beginPath();
            // Start path from the center of the first cell
            ctx.moveTo(
                (this.path[0].x + 0.5) * this.cellSize,
                (this.path[0].y + 0.5) * this.cellSize
            );
            // Draw lines to the center of subsequent cells
            for (let i = 1; i < this.path.length; i++) {
                ctx.lineTo(
                    (this.path[i].x + 0.5) * this.cellSize,
                    (this.path[i].y + 0.5) * this.cellSize
                );
            }
            ctx.stroke();
        }

        // Draw the mouse image, centered in the current cell
        if (mouseLogo && mouseLogo.complete) { 
            const imageSize = this.cellSize * 1.5; 
             ctx.save(); // Save context state
             ctx.translate((this.x + 0.5) * this.cellSize, (this.y + 0.5) * this.cellSize);


            ctx.drawImage(
                mouseLogo, 
                -imageSize / 2,
                -imageSize / 2,
                imageSize,
                imageSize
            );
            ctx.restore(); // Restore context state
        } else {
             // Fallback to drawing a circle if image is not loaded or provided
            ctx.fillStyle = '#ffffff'; // White circle fallback
            ctx.beginPath();
            ctx.arc(
                (this.x + 0.5) * this.cellSize, // Center X
                (this.y + 0.5) * this.cellSize, // Center Y
                this.cellSize * 0.4, // Radius
                0,
                Math.PI * 2
            );
            ctx.fill();
        }

    }

    /**
     * Attempts to move the mouse in a given direction.
     * @param {number} direction - The direction to move (0: right, 1: down, 2: left, 3: up).
     * @returns {boolean} True if the move was valid and successful, false otherwise.
     */
    move(direction) {
        const dx = [1, 0, -1, 0][direction]; // Change in x for each direction
        const dy = [0, 1, 0, -1][direction]; // Change in y for each direction

        const newX = this.x + dx;
        const newY = this.y + dy;

        // Check if the new position is valid in the maze (within bounds and not a wall)
        if (this.maze.isValidPosition(newX, newY)) {
            this.x = newX;
            this.y = newY;
            this.direction = direction; // Update mouse's internal direction
            this.visited.add(`${this.x},${this.y}`); // Mark cell as visited
            this.path.push({ x: this.x, y: this.y }); // Add new position to the path
            this.steps++; // Increment step count
            return true; // Move was successful
        }
        return false; // Move was invalid (hit a wall or out of bounds)
    }

    /**
     * Gets the current state representation of the mouse for the AI.
     * (Currently returns position, surrounding walls, and direction).
     * @returns {object} An object representing the current state.
     */
    getState() {
        const walls = [
            this.maze.isWall(this.x + 1, this.y),
            this.maze.isWall(this.x, this.y + 1),
            this.maze.isWall(this.x - 1, this.y),
            this.maze.isWall(this.x, this.y - 1)
        ];
        return {
            position: `${this.x},${this.y}`,
            walls: walls,
            direction: this.direction
        };
    }

    /**
     * Calculates the potential next position given a direction without actually moving.
     * @param {number} direction - The direction to check (0: right, 1: down, 2: left, 3: up).
     * @returns {{x: number, y: number}} The potential next position.
     */
    getNextPosition(direction) {
        const dx = [1, 0, -1, 0][direction];
        const dy = [0, 1, 0, -1][direction];
        const newX = this.x + dx;
        const newY = this.y + dy;
        return { x: newX, y: newY };
    }

    /**
     * Checks if the mouse's last move was a reversal of the previous move.
     * @returns {boolean} True if the mouse reversed direction in the last move, false otherwise.
     */
    isReversing() {
        if (this.path.length < 2) {
            return false; // Cannot be reversing if less than 2 steps taken
        }
        const currentPos = this.path[this.path.length - 1];
        const previousPos = this.path[this.path.length - 2];

        // Calculate direction from current to previous position
        const dx = currentPos.x - previousPos.x;
        const dy = currentPos.y - previousPos.y;

        // Determine the direction from previous to current to find the reverse
        let directionFromPrevious = -1; // -1 indicates no valid direction
        if (dx === 1 && dy === 0) directionFromPrevious = 0; // Right
        else if (dx === 0 && dy === 1) directionFromPrevious = 1; // Down
        else if (dx === -1 && dy === 0) directionFromPrevious = 2; // Left
        else if (dx === 0 && dy === -1) directionFromPrevious = 3; // Up

        // Check if the mouse's current direction is the reverse of the direction just taken
        // Right (0) -> Left (2), Down (1) -> Up (3), Left (2) -> Right (0), Up (3) -> Down (1)
        const reverseDirectionMap = { 0: 2, 1: 3, 2: 0, 3: 1 };
        
        return this.direction === reverseDirectionMap[directionFromPrevious];
    }

    /**
     * Checks if the mouse is currently at the end position of the maze.
     * @returns {boolean} True if the mouse is at the end, false otherwise.
     */
    isAtEnd() {
        return this.x === this.maze.end.x && this.y === this.maze.end.y;
    }
} 