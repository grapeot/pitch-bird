/**
 * 音频处理模块
 * 使用 Web Audio API 检测音调和音量
 */
class AudioProcessor {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;
        this.isListening = false;
        
        // 音调检测参数
        this.sampleRate = 44100;
        this.bufferSize = 2048;
        
        // 音调阈值（Hz）
        this.lowPitchThreshold = 250;   // 低于此值，小鸟下降
        this.highPitchThreshold = 350;  // 高于此值，小鸟上升（降低阈值，更容易触发）
        this.silenceThreshold = 0.02;   // 音量低于此值视为安静（提高阈值，减少噪音干扰）
        
        // 当前状态
        this.currentPitch = 0;
        this.currentVolume = 0;
        
        // 时间平滑：0.5秒的滑动窗口
        this.smoothingWindowSize = 30; // 假设60fps，0.5秒约30个样本
        this.pitchHistory = []; // 音调历史记录
        this.volumeHistory = []; // 音量历史记录
        this.smoothedPitch = 0;
        this.smoothedVolume = 0;
    }
    
    /**
     * 初始化音频上下文和麦克风
     */
    async init() {
        try {
            // 获取麦克风权限
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                } 
            });
            
            // 创建音频上下文
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.sampleRate = this.audioContext.sampleRate;
            
            // 创建分析器
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = this.bufferSize;
            this.analyser.smoothingTimeConstant = 0.3;
            
            // 连接麦克风到分析器
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.microphone.connect(this.analyser);
            
            // 创建数据数组
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            
            return true;
        } catch (error) {
            console.error('无法访问麦克风:', error);
            alert('无法访问麦克风，请确保已授予麦克风权限');
            return false;
        }
    }
    
    /**
     * 开始监听音频
     */
    startListening() {
        if (!this.analyser) {
            console.error('音频分析器未初始化');
            return;
        }
        this.isListening = true;
        this.updateAudioData();
    }
    
    /**
     * 停止监听
     */
    stopListening() {
        this.isListening = false;
    }
    
    /**
     * 更新音频数据（音量、音调）
     */
    updateAudioData() {
        if (!this.isListening || !this.analyser) return;
        
        // 获取频率数据
        this.analyser.getByteFrequencyData(this.dataArray);
        
        // 计算音量（平均振幅），并放大音量
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        const rawVolume = sum / this.dataArray.length / 255;
        // 放大音量：使用平方根函数增强小音量，然后乘以增益系数
        const rawVolumeProcessed = Math.min(Math.sqrt(rawVolume) * 2.5, 1);
        
        // 计算音调（找到最大频率分量）
        let maxIndex = 0;
        let maxValue = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            if (this.dataArray[i] > maxValue) {
                maxValue = this.dataArray[i];
                maxIndex = i;
            }
        }
        
        // 将频率索引转换为实际频率（Hz）
        // 降低阈值，更容易检测到音调
        let rawPitch = 0;
        if (maxValue > 20) {  // 降低阈值从50到20，更容易检测
            rawPitch = (maxIndex * this.sampleRate) / (2 * this.bufferSize);
        }
        
        // 添加到历史记录（1秒滑动窗口）
        this.volumeHistory.push(rawVolumeProcessed);
        this.pitchHistory.push(rawPitch);
        
        // 保持窗口大小
        if (this.volumeHistory.length > this.smoothingWindowSize) {
            this.volumeHistory.shift();
        }
        if (this.pitchHistory.length > this.smoothingWindowSize) {
            this.pitchHistory.shift();
        }
        
        // 计算平滑值（移动平均）
        const volumeSum = this.volumeHistory.reduce((a, b) => a + b, 0);
        this.smoothedVolume = volumeSum / this.volumeHistory.length;
        
        // 对于音调，只对非零值求平均
        const validPitches = this.pitchHistory.filter(p => p > 0);
        if (validPitches.length > 0) {
            const pitchSum = validPitches.reduce((a, b) => a + b, 0);
            this.smoothedPitch = pitchSum / validPitches.length;
        } else {
            this.smoothedPitch = 0;
        }
        
        // 更新当前值（使用平滑后的值）
        this.currentVolume = this.smoothedVolume;
        this.currentPitch = this.smoothedPitch;
        
        // 继续更新
        requestAnimationFrame(() => this.updateAudioData());
    }
    
    /**
     * 获取当前音量（0-1）
     */
    getVolume() {
        return this.currentVolume;
    }
    
    /**
     * 获取当前音调（Hz）
     */
    getPitch() {
        return this.currentPitch;
    }
    
    /**
     * 获取控制指令
     * @returns {string} 'up', 'down', 'neutral'
     */
    getControlCommand() {
        const volume = this.getVolume();
        const pitch = this.getPitch();
        
        // 如果音量太低，视为安静
        if (volume < this.silenceThreshold) {
            return 'neutral';
        }
        
        // 根据音调判断（更宽松的判断）
        if (pitch > this.highPitchThreshold) {
            return 'up';
        } else if (pitch > 0 && pitch < this.lowPitchThreshold) {
            return 'down';
        } else if (pitch > 0) {
            // 如果检测到音调但在中间范围，根据音调高低倾向判断
            const midPoint = (this.lowPitchThreshold + this.highPitchThreshold) / 2;
            if (pitch > midPoint) {
                return 'up';
            } else {
                return 'down';
            }
        } else {
            return 'neutral';
        }
    }
    
    /**
     * 设置音调阈值（用于校准）
     */
    setThresholds(low, high) {
        this.lowPitchThreshold = low;
        this.highPitchThreshold = high;
    }
    
    /**
     * 校准：记录当前音调作为阈值
     */
    calibrate() {
        const pitch = this.getPitch();
        if (pitch > 0) {
            // 如果当前音调较高，设为高阈值
            if (pitch > this.highPitchThreshold) {
                this.highPitchThreshold = pitch;
            } else {
                // 否则设为低阈值
                this.lowPitchThreshold = pitch;
            }
            return {
                low: this.lowPitchThreshold,
                high: this.highPitchThreshold
            };
        }
        return null;
    }
}

