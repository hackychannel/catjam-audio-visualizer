let canvas = document.getElementById("audio_visual");
let ctx = canvas.getContext("2d");

// canvas
const VISUALIZER_WIDTH = 500;
const GRAPH_WIDTH = 1000;

//load images
const NUM_FRAMES = 158;
const frames = [];
let loadedFrames = 0;
for (let i = 0; i < NUM_FRAMES; i++) {
    const image = new Image();
    image.src = `images/frames/catjam-frame-${i}.png`;
    image.onload = ()=>{ 
        loadedFrames += 1;
        if(loadedFrames === NUM_FRAMES){
            allLoaded();
        }
    }
    frames[i] = image;
}

// load audio source into AudioContext

let audioElement = document.getElementById("source");
let audioCtx = new AudioContext();
let analyser = audioCtx.createAnalyser();
analyser.fftSize = 2048;
let source = audioCtx.createMediaElementSource(audioElement);
source.connect(analyser);
source.connect(audioCtx.destination);

// low pass -> high pass filter 
let filterLPFreq = 150;
let filterLPQ = 1;
let filterHPFreq = 100;
let filterHPQ = 1;

var filterLP = audioCtx.createBiquadFilter();
filterLP.type = "lowpass";
filterLP.frequency.value = filterLPFreq;
filterLP.Q.value = filterLPQ;
var filterHP = audioCtx.createBiquadFilter();
filterHP.type = "highpass";
filterHP.frequency.value = filterHPFreq;
filterHP.Q.value = filterLPQ;
let analyserTest = audioCtx.createAnalyser();
analyserTest.fftSize = 2048;
source.connect(filterLP);
filterLP.connect(filterHP);
filterHP.connect(analyserTest);

// analyzer frequency arrays
let data = new Uint8Array(analyser.frequencyBinCount);
let dataTest = new Uint8Array(analyserTest.frequencyBinCount);
// analyzer time domain arrays
let dataTimeDomain = new Uint8Array(analyser.frequencyBinCount);
let dataTimeDomainTest = new Uint8Array(analyserTest.frequencyBinCount);

// graph data arrays
let graphSRC = Array(1000).fill(0);
let graphTest = Array(1000).fill(0);
let graphTdSRC = Array(1000).fill(0);
let graphTdTest = Array(1000).fill(0);
let graphVolSrc = Array(1000).fill(0)
let graphVolTest = Array(1000).fill(0);

// frame draw times
let frameDrawTimes = Array(1000).fill(0);

// animation beat state array
let catBeatState = Array(1000).fill(0);

// user tap state array
let tapBeat = 0;
let tapLastTime = 0;
let tapLastInstBpm = 0;
let tapBeatState = Array(1000).fill(0);

canvas.onclick = function() {
    tapBeat = 1;
}

// animation
let frameNum = 0;
let frameAdvancedAt = 0;
const BEATS_PER_CYCLE = 13
let beatsPerMinute = 120;
const FRAMES_PER_BEAT = NUM_FRAMES / BEATS_PER_CYCLE;
let framesPerSecond = (FRAMES_PER_BEAT * beatsPerMinute) / 60;
let msPerFrame = (1 / framesPerSecond) * 1000;
const CAT_NOD_FRAMES = [5, 18, 30, 42, 57, 66, 78, 89, 102, 114, 127, 138, 151];

// bpm histogram
const BPM_HISTORY_LENGTH = 60;
let bpmHistory = Array(BPM_HISTORY_LENGTH).fill(0);

// bpm analysis vars
let bpm_max = 150;
let bpm_min = 70;
let bpm_analysis_start_frame = 0;
let bpm_analysis_interval = 25;
let bpm_peak_threshold = 0.7;
// bpm settings button
let bpmSettingsButton = document.getElementById("set_bpm_settings");
bpmSettingsButton.onclick = function() {
    const bpmMinField = document.getElementById("bpm_min");
    if (bpmMinField && bpmMinField.value) {
        bpm_min = bpmMinField.value;
        console.log(`bpm_min -> ${bpm_min}`);
    } else {
        console.log('error setting bpm_min');
    }
    const bpmMaxField = document.getElementById("bpm_max");
    if (bpmMaxField && bpmMaxField.value) {
        bpm_max = bpmMaxField.value;
        console.log(`bpm_max -> ${bpm_max}`);
    } else {
        console.log('error setting bpm_max');
    }
    const bpmPeakThresholdField = document.getElementById("bpm_peak_threshold");
    if (bpmPeakThresholdField && bpmPeakThresholdField.value) {
        bpm_peak_threshold = bpmPeakThresholdField.value;
        console.log(`bpm_peak_threshold -> ${bpm_peak_threshold}`);
    } else {
        console.log('error setting bpm_peak_threshold');
    }
    /*
    const bpmStartField = document.getElementById("bpm_analysis_start");
    if (bpmStartField && bpmStartField.value) {
        bpm_analysis_start_frame = bpmStartField.value;
        console.log(`bpm_analysis_start_frame -> ${bpm_analysis_start_frame}`);
    } else {
        console.log('error setting bpm_analysis_start_frame');
    }
    const bpmIntField = document.getElementById("bpm_analysis_interval");
    if (bpmIntField && bpmIntField.value) {
        bpm_analysis_interval = bpmIntField.value;
        console.log(`bpm_min -> ${bpm_min}`);
    } else {
        console.log('error setting bpm_min');
    }
    */
};
// filter settings button
let filterSettingsButton = document.getElementById("set_filter_settings");
filterSettingsButton.onclick = function() {
    [
        ['lp_freq', 'filterLPFreq'],
        ['lp_q', 'filterLPQ'],
        ['hp_freq', 'filterHPFreq'],
        ['hp_q', 'filterHPQ'],
    ].forEach((fields) => {
        const [fieldName, varName] = fields;
        const field = document.getElementById(fieldName);
        if (field && field.value) {
            window[varName] = field.value;
            console.log(`${varName} -> ${window[varName]}`);
        } else {
            console.log(`error setting ${varName}`);
        }
    });
    filterLP.frequency.value = filterLPFreq;
    filterLP.Q.value = filterLPQ;
    filterHP.frequency.value = filterHPFreq;
    filterHP.Q.value = filterLPQ;
};

let useSourceAudioForAnalysis = false;
let toggleAnalysisButton = document.getElementById("toggle_analysis");
toggleAnalysisButton.onclick = function() {
    useSourceAudioForAnalysis = !useSourceAudioForAnalysis;
}

// when all images are loaded, start animation
function allLoaded() {
    requestAnimationFrame(loopingFunction);
}

// main data request -> draw loop
function loopingFunction(){
    requestAnimationFrame(loopingFunction);
    analyser.getByteFrequencyData(data);
    analyser.getByteTimeDomainData(dataTimeDomain)
    analyserTest.getByteTimeDomainData(dataTimeDomainTest);
    analyserTest.getByteFrequencyData(dataTest)
    draw(data, dataTest, dataTimeDomain, dataTimeDomainTest);
}

// canvas draw function
function draw(data, dataTest, dataTimeDomain, dataTimeDomainTest){
    const FLOOR_SOURCE = 300;
    const FLOOR_TEST = 500;

    // clear canvas
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // paint timestamp
    ctx.font = '30px sans-serif';
    ctx.fillText(Date.now(), 150, 40);

    // paint graph labels
    ctx.font = '16px sans-serif';
    ctx.fillText('Source', 250, FLOOR_SOURCE-200);
    ctx.fillText('Lowpass + Highpass filter', 250, FLOOR_TEST-200);
    
    // paint frequency graphs
    drawGraph(data, FLOOR_SOURCE, 'orange');
    drawGraph(dataTest, FLOOR_TEST, 'teal');

    // paint waveform graphs
    drawTimeDomainData(dataTimeDomain, FLOOR_SOURCE);
    drawTimeDomainData(dataTimeDomainTest, FLOOR_TEST);

    // paint max volume graph (does bpm determination logic)
    if (useSourceAudioForAnalysis) {
        drawVolGraph(data, graphVolSrc, FLOOR_SOURCE);
    } else {
        drawVolGraph(dataTest, graphVolTest, FLOOR_TEST);
    }

    //drawWave(dataTest, graphTest, FLOOR_TEST);

    const now = Date.now();
    // calculate bpm to be at
    // - use most frequent BPM result from the past 30 frames
    bpmHistogram = bpmHistory.reduce((acc, cur) => {
        if (!cur) {
            return acc;
        }
        if (acc[cur]) {
            acc[cur]++;
        } else {
            acc[cur] = 1;
        }
        return acc;
    }, {});
    if (Object.keys(bpmHistogram).length > 0) {
        ctx.fillStyle = 'black';
        ctx.font = '12px sans-serif';
        ctx.fillText(`bpmHistogram: ${JSON.stringify(bpmHistogram)}`, 550, 200, 450);
        const historicalBPM = Object.keys(bpmHistogram).reduce((a, b) => bpmHistogram[a] > bpmHistogram[b] ? a : b, 0);
        if (historicalBPM) {
            beatsPerMinute = historicalBPM;
        }
    }
    // recalculate ms per frame from current bpm
    msPerFrame = (1 / ((FRAMES_PER_BEAT * beatsPerMinute) / 60)) * 1000;
    // do we advance the animation frame this draw?
    if (now > frameAdvancedAt + msPerFrame) {
        frameNum = (frameNum + 1) % NUM_FRAMES;
        frameAdvancedAt = now;
    }
    // draw cat 1
    CAT_POS_X = 520;
    CAT_POS_Y = 20;
    CAT_HEIGHT = 112;
    CAT_WIDTH = 112;
    ctx.fillStyle = 'rgb(0, 255, 0)';
    ctx.fillRect(CAT_POS_X - 20, CAT_POS_Y - 20, CAT_WIDTH + 40, CAT_HEIGHT + 40);
    ctx.drawImage(frames[frameNum], CAT_POS_X, CAT_POS_Y);

    // draw statistical data
    ctx.fillStyle = 'black';
    ctx.font = '30px sans-serif';
    ctx.fillText(`current BPM: ${beatsPerMinute}`, 650, 75);
    ctx.font = '20px sans-serif';
    ctx.fillText(`ms per frame: ${msPerFrame}`, 650, 100);
    ctx.fillText(`frame counter: ${frameNum}`, 650, 125);

    // draw cat 2
    CAT2_POS_X = 550;
    CAT2_POS_Y = 400;
    CAT2_HEIGHT = 448;
    CAT2_WIDTH = 448;
    CAT2_MARGIN = 30;
    ctx.fillStyle = 'rgb(0, 255, 0)';
    ctx.fillRect(CAT2_POS_X - CAT2_MARGIN, CAT2_POS_Y - CAT2_MARGIN, CAT2_HEIGHT + (CAT2_MARGIN*2), CAT2_WIDTH + (CAT2_MARGIN*2));
    ctx.drawImage(frames[frameNum], CAT2_POS_X, CAT2_POS_Y, CAT2_WIDTH, CAT2_HEIGHT);
    ctx.fillStyle = 'black';

    // draw fps estimate
    frameDrawTimes.push(now);
    const earliestFrameTime = frameDrawTimes.shift();
    const avgFPS = earliestFrameTime > 0 
        ? (frameDrawTimes.length / (now - earliestFrameTime)) * 1000
        : 'calculating...';
    ctx.font = '30px sans-serif';
    ctx.fillText(`avg FPS: ${avgFPS}`, 650, 40);

    // draw cat nod beats
    newCatBeatState = (frameAdvancedAt == now && CAT_NOD_FRAMES.includes(frameNum)) ? 1 : 0;
    catBeatState.push(newCatBeatState);
    catBeatState.shift();
    catBeatState.forEach((beatState, i) => {
        if (beatState) {
            ctx.beginPath();
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'brown';
            ctx.moveTo(i,200-25);
            ctx.lineTo(i,200+25);
            ctx.stroke();
        }
    });

    // draw user tap beats
    if (tapBeat) {
        if (tapLastTime) {
            tapLastInstBpm = 1 / ((now - tapLastTime) / (1000*60));
        }
        tapLastTime = now;
    }
    tapBeatState.push(tapBeat);
    tapBeatState.shift();
    tapBeat = 0;
    tapBeatState.forEach((beatState, i) => {
        if (beatState) {
            ctx.beginPath();
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'green';
            ctx.moveTo(i,240-25);
            ctx.lineTo(i,240+25);
            ctx.stroke();
        }
    });
    const tapBeats = tapBeatState.reduce((acc, cur) => {
        return acc + cur;
    }, 0);
    const tapBPM = tapBeats / ((now - frameDrawTimes[0]) / (1000*60));
    ctx.font = '20px sans-serif';
    ctx.fillText(`tap avg BPM: ${Math.round(tapBPM)}, instantaneous BPM: ${Math.round(tapLastInstBpm)}`, 650, 150);
}

// draws timedomain data into a waveform
function drawTimeDomainData(data, floor) {
    const HEIGHT = 250;
    const WIDTH = 500
    const bufferLength = analyser.frequencyBinCount;
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'black';
    ctx.beginPath();
    var sliceWidth = WIDTH * 1.0 / bufferLength;
    var x = 0;
    for(var i = 0; i < bufferLength; i++) {
        var v = data[i] / 128.0;
        var y = v * HEIGHT/2;

        if(i === 0) {
            ctx.moveTo(x, y+(floor-250));
        } else {
            ctx.lineTo(x, y+(floor-250));
        }

        x += sliceWidth;
    }
    ctx.lineTo(WIDTH, (HEIGHT/2)+(floor-250));
    ctx.stroke();
}

// calculates maximum volume of current data, appends to graph, draws graph
// does BPM calculation based on graph data
function drawVolGraph(data, graph, floor) {
    data = [...data];
    let space = 1;
    // calculate volume of this frame of data, append to graph
    let valueMax = calculateMax(data);
    graph.push(valueMax);
    graph.shift();
    // draw graph
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'red';
    for(let i = 0; i < graph.length; i++) {
        const value = graph[i];
        if(i === 0) {
            ctx.moveTo(space*i,floor-value);
        } else {
            ctx.lineTo(space*i,floor-value);
        }
    }
    ctx.stroke();

    // get bpm analysis settings, draw next to graph
    //const ANALYSIS_START = bpm_analysis_start_frame;
    //const FRAME_INTERVAL = bpm_analysis_interval;
    const ANALYSIS_START = 0;
    const FRAME_INTERVAL = 15;
    const INTERVAL_WIDTH = 45;
    const TEMPO_MIN = bpm_min;
    const TEMPO_MAX = bpm_max;
    const PEAKS_FILTER_PERCENT = bpm_peak_threshold;
    ctx.font = '16px sans-serif';
    ctx.fillStyle = 'black';
    ctx.fillText(`bpm_peak_threshold [${PEAKS_FILTER_PERCENT}]`, 1050, floor-220);
    ctx.fillText(`bpm_min [${TEMPO_MIN}]`, 1050, floor-200);
    ctx.fillText(`bpm_max [${TEMPO_MAX}]`, 1050, floor-180);
    //ctx.fillText(`analysis_start_frame [${ANALYSIS_START}]`, 1050, floor-160);
    //ctx.fillText(`frame_interval [${FRAME_INTERVAL}]`, 1050, floor-140);

    // find and draw peaks in vol graph
    // peaks calculation:
    const peaks = [];
    for (let i = ANALYSIS_START; i < (graph.length - FRAME_INTERVAL); i += FRAME_INTERVAL) {
        const max = { position: 0, volume: 0, drawTime: 0 };
        for (let j = i; j < i + INTERVAL_WIDTH; j++) {
            //console.log(`i ${i}, j ${j}`);
            if (!graph[j]) {
                continue;
            }
            if (max.position == 0 || Math.abs(graph[j]) > max.volume) {
                max.position = j;
                max.volume = graph[j];
                max.drawTime = frameDrawTimes[j];
            }
        }
        if (max.drawTime > 0) {
            peaks.push(max);
        }
    }
    peaks.sort(function(a, b) {
        if (a.volume == b.volume) {
            return b.position - a.position;
        } else {
            return b.volume - a.volume;
        }
    });
    peaks.forEach((peak, idx) => {
        const col = idx > peaks.length * PEAKS_FILTER_PERCENT ? 160 : 0;
        const i = peak.position;
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgb(${col},${col},${col})`;
        ctx.moveTo(space*i,(floor-200)-25); //x,y
        ctx.lineTo(space*i,(floor-200)+25); //x,y
        ctx.stroke();
    });
    filteredPeaks = peaks.splice(0, peaks.length * PEAKS_FILTER_PERCENT);

    // get intervals from peaks
    const groups = [];
    //filteredPeaks.forEach((peak, idx) => {
    for (let idx = 0; idx < filteredPeaks.length; idx++) {
        for (let i = idx + 1; i < filteredPeaks.length; i++) {
            if (!filteredPeaks[idx].drawTime || !filteredPeaks[idx].drawTime) {
                continue;
            }
            if (Math.abs(filteredPeaks[idx].drawTime - filteredPeaks[i].drawTime) == 0) {
                continue;
            }
            const tempo = 1 / (Math.abs(filteredPeaks[idx].drawTime - filteredPeaks[i].drawTime) / 1000000);
            const group = {
                tempo,
                count: 1
            };
            if (group.tempo <= 0) {
                continue;
            }
            while (group.tempo < TEMPO_MIN) {
                group.tempo *= 2;
            }
            while (group.tempo > TEMPO_MAX) {
                group.tempo /= 2;
            }
            group.tempo = Math.round(group.tempo);
            if (!(groups.some(function(interval) {
                return (interval.tempo === group.tempo ? interval.count++ : 0);
            }))) {
                groups.push(group);
            }
        }
    }
    var top = groups.sort(function(intA, intB) {
        return intB.count - intA.count;
    }).splice(0, 5);
    top.forEach((group, idx) => {
        ctx.font = '16px sans-serif';
        ctx.fillText(`${idx+1}. ${group.tempo} BPM [${group.count}]`, 300, floor-((6-idx)*20));
    });
    if (top[0]) {
        if (Math.abs(beatsPerMinute - top[0].tempo) >= 3) {
            beatsPerMinute = top[0].tempo;
        }
        bpmHistory.push(top[0].tempo);
        bpmHistory.shift();
    }
}

function drawWave(data, graph, floor) {
    data = [...data];
    let space = 1;

    let valueRMS = calculateRMS(data);
    graph.push(valueRMS);
    graph.shift();
    graph.forEach((value, i) => {
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'blue';
        ctx.moveTo(space*i,floor-(value-1)); //x,y
        ctx.lineTo(space*i,floor-(value+1)); //x,y
        ctx.stroke();
    });

}

function calculateRMS(data) {
    let valueSumSquared = data.reduce((acc, value) => {
        return acc + (value * value);
    }, 0);
    return Math.sqrt(valueSumSquared / data.length);
}
function calculateMax(data) {
    return data.reduce((acc, value) => {
        return Math.max(value, acc);
    }, 0);
}

function drawGraph(data, floor, color) {
    data = [...data];
    let space = 1;

    let valueRMS = calculateRMS(data);
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'blue';
    ctx.moveTo(0,floor-valueRMS);
    ctx.lineTo(VISUALIZER_WIDTH,floor-valueRMS);
    ctx.stroke();

    let valueSum = data.reduce((acc, value) => {
        return acc + value;
    }, 0);
    let valueMean = valueSum / data.length;
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'cyan';
    ctx.moveTo(0,floor-valueMean);
    ctx.lineTo(VISUALIZER_WIDTH,floor-valueMean);
    ctx.stroke();

    let valueMax = calculateMax(data);
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'red';
    ctx.moveTo(0,floor-valueMax);
    ctx.lineTo(VISUALIZER_WIDTH,floor-valueMax);
    ctx.stroke();

    data.forEach((value, i) => {
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = color;
        ctx.moveTo(space*i,floor); //x,y
        ctx.lineTo(space*i,floor-value); //x,y
        ctx.stroke();
    });
}

audioElement.onplay = ()=>{
    audioCtx.resume();
}