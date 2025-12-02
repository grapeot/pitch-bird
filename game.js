/**
 * 游戏核心逻辑
 */
class Game {
    constructor(canvas, audioProcessor) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.audioProcessor = audioProcessor;
        
        // 设置画布尺寸
        this.canvas.width = 500;
        this.canvas.height = 600;
        
        // 游戏状态
        this.isRunning = false;
        this.score = 0;
        this.gameSpeed = 1.5;  // 降低管道移动速度
        
        // 小鸟属性
        this.bird = {
            x: 100,
            y: this.canvas.height / 2,
            width: 40,
            height: 30,
            velocity: 0,
            gravity: 0.001,  // 重力改为1/10，让小鸟下降非常慢
            jumpPower: -3,  // 降低跳跃力度，让垂直速度更慢
            maxVelocity: 3  // 降低最大速度，让垂直移动更慢
        };
        
        // 管道数组
        this.pipes = [];
        this.pipeWidth = 60;
        this.pipeGap = 220;  // 增加管道间隙，更容易通过
        this.pipeSpacing = 350;  // 增加管道间距，给玩家更多反应时间
        this.lastPipeX = this.canvas.width;
        
        // 初始化
        this.init();
    }
    
    init() {
        // 创建初始管道
        this.createPipe(this.canvas.width);
    }
    
    /**
     * 创建新管道
     */
    createPipe(x) {
        const minHeight = 80;  // 增加最小高度，避免管道太靠近边缘
        const maxHeight = this.canvas.height - this.pipeGap - minHeight;
        const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
        
        this.pipes.push({
            x: x,
            topHeight: topHeight,
            bottomY: topHeight + this.pipeGap,
            bottomHeight: this.canvas.height - (topHeight + this.pipeGap),
            passed: false
        });
    }
    
    /**
     * 开始游戏
     */
    start() {
        this.isRunning = true;
        this.score = 0;
        this.bird.y = this.canvas.height / 2;
        this.bird.velocity = 0;
        this.pipes = [];
        this.lastPipeX = this.canvas.width;
        // 延迟创建第一个管道，给玩家准备时间
        setTimeout(() => {
            this.createPipe(this.canvas.width);
        }, 1000);
        this.gameLoop();
    }
    
    /**
     * 停止游戏
     */
    stop() {
        this.isRunning = false;
    }
    
    /**
     * 更新游戏状态
     */
    update() {
        if (!this.isRunning) return;
        
        // 根据音频控制小鸟
        const command = this.audioProcessor.getControlCommand();
        const volume = this.audioProcessor.getVolume();
        const pitch = this.audioProcessor.getPitch();
        
        // 应用控制（降低速度）- 反转上下控制
        if (command === 'up') {
            // 音调高，向下飞（反转）
            const intensity = Math.min(volume * 2, 1);
            this.bird.velocity = this.bird.jumpPower * (0.8 + intensity * 0.8);
        } else if (command === 'down') {
            // 音调低，向上飞（反转）
            this.bird.velocity = -this.bird.jumpPower * 0.6;
        } else {
            // 中性，应用重力
            this.bird.velocity += this.bird.gravity;
        }
        
        // 限制速度（降低速度限制）
        this.bird.velocity = Math.max(-this.bird.maxVelocity, 
                                      Math.min(this.bird.maxVelocity, this.bird.velocity));
        
        // 更新小鸟位置
        this.bird.y += this.bird.velocity;
        
        // 边界检测
        if (this.bird.y < 0) {
            this.bird.y = 0;
            this.bird.velocity = 0;
        }
        if (this.bird.y + this.bird.height > this.canvas.height) {
            this.bird.y = this.canvas.height - this.bird.height;
            this.gameOver();
            return;
        }
        
        // 更新管道
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.x -= this.gameSpeed;
            
            // 检测碰撞
            if (this.checkCollision(this.bird, pipe)) {
                this.gameOver();
                return;
            }
            
            // 检测得分
            if (!pipe.passed && pipe.x + this.pipeWidth < this.bird.x) {
                pipe.passed = true;
                this.score++;
            }
            
            // 移除屏幕外的管道
            if (pipe.x + this.pipeWidth < 0) {
                this.pipes.splice(i, 1);
            }
        }
        
        // 创建新管道
        if (this.pipes.length === 0 || 
            this.pipes[this.pipes.length - 1].x < this.canvas.width - this.pipeSpacing) {
            this.createPipe(this.canvas.width);
        }
    }
    
    /**
     * 检测碰撞
     */
    checkCollision(bird, pipe) {
        const birdRight = bird.x + bird.width;
        const birdLeft = bird.x;
        const birdTop = bird.y;
        const birdBottom = bird.y + bird.height;
        
        const pipeLeft = pipe.x;
        const pipeRight = pipe.x + this.pipeWidth;
        
        // 检查是否在管道范围内
        if (birdRight > pipeLeft && birdLeft < pipeRight) {
            // 检查是否撞到顶部或底部管道
            if (birdTop < pipe.topHeight || birdBottom > pipe.bottomY) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * 绘制游戏画面
     */
    draw() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制背景（天空和地面）
        this.drawBackground();
        
        // 绘制管道
        this.drawPipes();
        
        // 绘制小鸟
        this.drawBird();
        
        // 绘制分数
        this.drawScore();
    }
    
    /**
     * 绘制背景
     */
    drawBackground() {
        // 天空
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(0.7, '#87CEEB');
        gradient.addColorStop(0.7, '#90EE90');
        gradient.addColorStop(1, '#90EE90');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 地面装饰线
        this.ctx.strokeStyle = '#654321';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.canvas.height * 0.7);
        this.ctx.lineTo(this.canvas.width, this.canvas.height * 0.7);
        this.ctx.stroke();
    }
    
    /**
     * 绘制小鸟
     */
    drawBird() {
        const { x, y, width, height } = this.bird;
        
        // 根据速度调整小鸟角度
        const angle = Math.atan2(this.bird.velocity, 5) * 0.5;
        
        this.ctx.save();
        this.ctx.translate(x + width / 2, y + height / 2);
        this.ctx.rotate(angle);
        
        // 绘制小鸟身体（简单的椭圆）
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, width / 2, height / 2, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 绘制眼睛
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(5, -5, 4, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 绘制嘴巴
        this.ctx.fillStyle = '#FF6347';
        this.ctx.beginPath();
        this.ctx.moveTo(width / 2 - 5, 0);
        this.ctx.lineTo(width / 2 + 5, -3);
        this.ctx.lineTo(width / 2 + 5, 3);
        this.ctx.closePath();
        this.ctx.fill();
        
        // 绘制翅膀
        this.ctx.fillStyle = '#FFA500';
        this.ctx.beginPath();
        this.ctx.ellipse(-5, 5, 8, 12, Math.sin(Date.now() / 100) * 0.3, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    /**
     * 绘制管道
     */
    drawPipes() {
        this.ctx.fillStyle = '#228B22';
        this.ctx.strokeStyle = '#006400';
        this.ctx.lineWidth = 3;
        
        for (const pipe of this.pipes) {
            // 顶部管道
            this.ctx.fillRect(pipe.x, 0, this.pipeWidth, pipe.topHeight);
            this.ctx.strokeRect(pipe.x, 0, this.pipeWidth, pipe.topHeight);
            
            // 顶部管道装饰
            this.ctx.fillStyle = '#32CD32';
            this.ctx.fillRect(pipe.x, pipe.topHeight - 20, this.pipeWidth, 20);
            this.ctx.strokeRect(pipe.x, pipe.topHeight - 20, this.pipeWidth, 20);
            
            // 底部管道
            this.ctx.fillStyle = '#228B22';
            this.ctx.fillRect(pipe.x, pipe.bottomY, this.pipeWidth, pipe.bottomHeight);
            this.ctx.strokeRect(pipe.x, pipe.bottomY, this.pipeWidth, pipe.bottomHeight);
            
            // 底部管道装饰
            this.ctx.fillStyle = '#32CD32';
            this.ctx.fillRect(pipe.x, pipe.bottomY, this.pipeWidth, 20);
            this.ctx.strokeRect(pipe.x, pipe.bottomY, this.pipeWidth, 20);
        }
    }
    
    /**
     * 绘制分数
     */
    drawScore() {
        this.ctx.fillStyle = '#FFF';
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 3;
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        const text = this.score.toString();
        this.ctx.strokeText(text, this.canvas.width / 2, 50);
        this.ctx.fillText(text, this.canvas.width / 2, 50);
    }
    
    /**
     * 游戏循环
     */
    gameLoop() {
        if (!this.isRunning) return;
        
        this.update();
        this.draw();
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    /**
     * 游戏结束
     */
    gameOver() {
        this.stop();
        if (typeof this.onGameOver === 'function') {
            this.onGameOver(this.score);
        }
    }
    
    /**
     * 获取当前分数
     */
    getScore() {
        return this.score;
    }
}

