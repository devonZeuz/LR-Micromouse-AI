// Class representing the maze grid and its generation/drawing logic.
export class Maze {
    /**
     * @param {number} width - The width of the maze grid (number of cells).
     * @param {number} height - The height of the maze grid (number of cells).
     * @param {number} cellSize - The size of each cell in pixels when drawing.
     */
    constructor(width, height, cellSize) {
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;
        this.grid = []; // 2D array to store maze cells (0 for path, 1 for wall)
        this.start = { x: 1, y: 1 }; // Start position of the maze
        this.end = { x: width - 2, y: height - 2 }; // End position of the maze
        this.generate(); // Generate the maze when a new Maze object is created
    }

    // Generates the maze using a recursive backtracking algorithm.
    generate() {
        // Initialize grid with walls
        for (let y = 0; y < this.height; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.grid[y][x] = 1; // 1 represents wall
            }
        }

        // Use recursive backtracking to generate maze
        this.carvePath(this.start.x, this.start.y);
        
        // Ensure start and end are clear
        this.grid[this.start.y][this.start.x] = 0;
        this.grid[this.end.y][this.end.x] = 0;
    }

    /**
     * Recursive function to carve paths in the maze.
     * @param {number} x - The current x-coordinate.
     * @param {number} y - The current y-coordinate.
     */
    carvePath(x, y) {
        this.grid[y][x] = 0; // Mark current cell as path

        // Define possible directions (up, right, down, left)
        const directions = [
            [0, -2], [2, 0], [0, 2], [-2, 0]
        ];
        
        // Shuffle directions
        for (let i = directions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [directions[i], directions[j]] = [directions[j], directions[i]];
        }

        // Try each direction
        for (const [dx, dy] of directions) {
            const newX = x + dx;
            const newY = y + dy;

            if (newX > 0 && newX < this.width - 1 && newY > 0 && newY < this.height - 1 
                && this.grid[newY][newX] === 1) {
                // Carve path between current cell and new cell
                this.grid[y + dy/2][x + dx/2] = 0;
                this.carvePath(newX, newY);
            }
        }
    }

    /**
     * Draws the maze on the given canvas context.
     * @param {CanvasRenderingContext2D} ctx - The 2D rendering context of the canvas.
     */
    draw(ctx) {
        // Clear the canvas first
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // Save the current context state
        ctx.save();

        // Calculate scaling factors
        const scaleX = ctx.canvas.width / (this.width * this.cellSize);
        const scaleY = ctx.canvas.height / (this.height * this.cellSize);
        const scale = Math.min(scaleX, scaleY);
        
        // Calculate the centered position
        const offsetX = (ctx.canvas.width - this.width * this.cellSize * scale) / 2;
        const offsetY = (ctx.canvas.height - this.height * this.cellSize * scale) / 2;
        
        // Apply scaling and translate to center the maze
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);

        // Draw maze background
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, this.width * this.cellSize, this.height * this.cellSize);

        // Draw walls
        ctx.fillStyle = '#000000';
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.grid[y][x] === 1) {
                    ctx.fillRect(
                        x * this.cellSize,
                        y * this.cellSize,
                        this.cellSize,
                        this.cellSize
                    );
                }
            }
        }

        // Draw paths
        ctx.fillStyle = '#2a2a2a';
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.grid[y][x] === 0) {
                    ctx.fillRect(
                        x * this.cellSize,
                        y * this.cellSize,
                        this.cellSize,
                        this.cellSize
                    );
                }
            }
        }

        // Draw start and end points
        ctx.fillStyle = '#00ffff'; // Cyan start
        ctx.fillRect(
            this.start.x * this.cellSize,
            this.start.y * this.cellSize,
            this.cellSize,
            this.cellSize
        );

        ctx.fillStyle = '#ffff00'; // Yellow end
        ctx.fillRect(
            this.end.x * this.cellSize,
            this.end.y * this.cellSize,
            this.cellSize,
            this.cellSize
        );

        // Add a border around the end cell
        ctx.strokeStyle = '#ff00ff'; // Magenta border
        ctx.lineWidth = 3;
        ctx.strokeRect(
            this.end.x * this.cellSize,
            this.end.y * this.cellSize,
            this.cellSize,
            this.cellSize
        );

        // Restore the context state
        ctx.restore();
    }

    /**
     * Checks if a given cell is a wall.
     * @param {number} x - The x-coordinate of the cell.
     * @param {number} y - The y-coordinate of the cell.
     * @returns {boolean} True if the cell is a wall, false otherwise.
     */
    isWall(x, y) {
        return this.grid[y][x] === 1;
    }

    /**
     * Checks if a given coordinate is within the maze bounds and is not a wall.
     * @param {number} x - The x-coordinate.
     * @param {number} y - The y-coordinate.
     * @returns {boolean} True if the position is valid and not a wall, false otherwise.
     */
    isValidPosition(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height && this.grid[y][x] === 0;
    }
} 