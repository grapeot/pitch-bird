/**
 * 主程序入口
 */
let audioProcessor;
let game;

// DOM 元素
const startBtn = document.getElementById('startBtn');
const calibrateBtn = document.getElementById('calibrateBtn');
const restartBtn = document.getElementById('restartBtn');
const gameOverDiv = document.getElementById('gameOver');
const canvas = document.getElementById('gameCanvas');
const volumeBar = document.getElementById('volumeBar');
const pitchValue = document.getElementById('pitchValue');
const commandValue = document.getElementById('commandValue');
const scoreDisplay = document.getElementById('score');
const finalScoreDisplay = document.getElementById('finalScore');

// 初始化
async function init() {
    // 创建音频处理器
    audioProcessor = new AudioProcessor();
    
    // 初始化音频
    const success = await audioProcessor.init();
    if (!success) {
        startBtn.disabled = true;
        calibrateBtn.disabled = true;
        return;
    }
    
    // 创建游戏实例
    game = new Game(canvas, audioProcessor);
    
    // 设置游戏结束回调
    game.onGameOver = (score) => {
        finalScoreDisplay.textContent = score;
        gameOverDiv.classList.remove('hidden');
    };
    
    // 开始监听音频
    audioProcessor.startListening();
    
    // 更新音频信息显示
    updateAudioDisplay();
}

// 更新音频信息显示
function updateAudioDisplay() {
    if (!audioProcessor) return;
    
    const volume = audioProcessor.getVolume();
    const pitch = audioProcessor.getPitch();
    const command = audioProcessor.getControlCommand();
    
    // 更新音量条（放大显示，最小显示5%以便看到变化）
    const displayVolume = Math.max(volume * 100, volume > 0 ? 5 : 0);
    volumeBar.style.width = displayVolume + '%';
    
    // 更新音调显示
    if (pitch > 0) {
        pitchValue.textContent = Math.round(pitch) + ' Hz';
        pitchValue.style.color = command === 'up' ? '#4CAF50' : 
                                 command === 'down' ? '#F44336' : '#666';
    } else {
        pitchValue.textContent = '-- Hz';
        pitchValue.style.color = '#666';
    }
    
    // 更新控制状态显示
    const commandText = {
        'up': '↑ 上升',
        'down': '↓ 下降',
        'neutral': '→ 平飞'
    };
    commandValue.textContent = commandText[command] || '--';
    commandValue.style.color = command === 'up' ? '#4CAF50' : 
                              command === 'down' ? '#F44336' : '#666';
    
    // 更新分数
    if (game) {
        scoreDisplay.textContent = game.getScore();
    }
    
    requestAnimationFrame(updateAudioDisplay);
}

// 开始游戏
startBtn.addEventListener('click', () => {
    if (!game || !audioProcessor) {
        alert('请先初始化游戏');
        return;
    }
    
    gameOverDiv.classList.add('hidden');
    game.start();
    startBtn.disabled = true;
    calibrateBtn.disabled = true;
});

// 校准麦克风
calibrateBtn.addEventListener('click', () => {
    if (!audioProcessor) return;
    
    const result = audioProcessor.calibrate();
    if (result) {
        alert(`校准完成！\n低音调阈值: ${Math.round(result.low)} Hz\n高音调阈值: ${Math.round(result.high)} Hz`);
    } else {
        alert('请先发出声音进行校准');
    }
});

// 重新开始
restartBtn.addEventListener('click', () => {
    gameOverDiv.classList.add('hidden');
    startBtn.disabled = false;
    calibrateBtn.disabled = false;
    
    if (game) {
        game.start();
        startBtn.disabled = true;
        calibrateBtn.disabled = true;
    }
});

// 页面加载完成后初始化
window.addEventListener('load', init);

