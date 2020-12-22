let canvas = document.getElementById("audio_visual");
let ctx = canvas.getContext("2d");
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

let audioElement = document.getElementById("source");
let audioCtx = new AudioContext();
let analyser = audioCtx.createAnalyser();
analyser.fftSize = 2048;
let source = audioCtx.createMediaElementSource(audioElement);
source.connect(analyser);
source.connect(audioCtx.destination);

// low pass -> high pass filter 
var filterLP = audioCtx.createBiquadFilter();
filterLP.type = "lowpass";
filterLP.frequency.value = 150;
filterLP.Q.value = 1;
var filterHP = audioCtx.createBiquadFilter();
filterHP.type = "highpass";
filterHP.frequency.value = 100;
filterHP.Q.value = 1;
let analyserTest = audioCtx.createAnalyser();
analyserTest.fftSize = 2048;
source.connect(filterLP);
filterLP.connect(filterHP);
filterHP.connect(analyserTest);

let data = new Uint8Array(analyser.frequencyBinCount);
let dataTest = new Uint8Array(analyserTest.frequencyBinCount);
let graphSRC = Array(1000).fill(0);
let graphTest = Array(1000).fill(0);

let graphTdSRC = Array(1000).fill(0);
let graphTdTest = Array(1000).fill(0);

let graphVolTest = Array(1000).fill(0);

const startTime = Date.now();
let frameDrawTimes = Array(1000).fill(0);
let catBeatState = Array(1000).fill(0);

let dataTimeDomain = new Uint8Array(analyser.frequencyBinCount);
let dataTimeDomainTest = new Uint8Array(analyserTest.frequencyBinCount);

let frameNum = 0;
let frameAdvancedAt = 0;
const BEATS_PER_CYCLE = 13
let beatsPerMinute = 120;
const FRAMES_PER_BEAT = NUM_FRAMES / BEATS_PER_CYCLE;
let framesPerSecond = (FRAMES_PER_BEAT * beatsPerMinute) / 60;
let msPerFrame = (1 / framesPerSecond) * 1000;
const CAT_NOD_FRAMES = [5, 18, 30, 42, 57, 66, 78, 89, 102, 114, 127, 138, 151];

let bpmHistory = Array(30).fill(0);

function allLoaded() {
    requestAnimationFrame(loopingFunction);
}

function loopingFunction(){
    requestAnimationFrame(loopingFunction);
    analyser.getByteFrequencyData(data);
    analyser.getByteTimeDomainData(dataTimeDomain)
    analyserTest.getByteTimeDomainData(dataTimeDomainTest);
    analyserTest.getByteFrequencyData(dataTest)
    draw(data, dataTest, dataTimeDomain, dataTimeDomainTest);
}

function draw(data, dataTest, dataTimeDomain, dataTimeDomainTest){
    const FLOOR_SOURCE = 250;
    const FLOOR_TEST = 500;

    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.font = '30px sans-serif';
    ctx.fillText(Date.now(), 150, 40);
    ctx.font = '16px sans-serif';
    ctx.fillText('Source', 250, FLOOR_SOURCE-200);
    ctx.fillText('Lowpass + Highpass filter', 250, FLOOR_TEST-200);
    
    drawGraph(data, FLOOR_SOURCE, 'orange');
    drawGraph(dataTest, FLOOR_TEST, 'teal');

    drawTimeDomainData(dataTimeDomain, FLOOR_SOURCE);
    drawTimeDomainData(dataTimeDomainTest, FLOOR_TEST);

    drawVolGraph(dataTest, graphVolTest, FLOOR_TEST)

    //drawWave(dataTest, graphTest, FLOOR_TEST);

    const now = Date.now();
    // calculate current bpm
    //console.log(JSON.stringify(bpmHistory));
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
    //console.log(JSON.stringify(bpmHistogram));
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
    if (now > frameAdvancedAt + msPerFrame) {
        frameNum = (frameNum + 1) % NUM_FRAMES;
        frameAdvancedAt = now;
    }
    CAT_POS_X = 520;
    CAT_POS_Y = 20;
    CAT_HEIGHT = 112;
    CAT_WIDTH = 112;
    ctx.fillStyle = 'rgb(0, 255, 0)';
    ctx.fillRect(CAT_POS_X - 20, CAT_POS_Y - 20, CAT_WIDTH + 40, CAT_HEIGHT + 40);
    ctx.drawImage(frames[frameNum], CAT_POS_X, CAT_POS_Y);
    ctx.fillStyle = 'black';
    ctx.font = '30px sans-serif';
    ctx.fillText(`current BPM: ${beatsPerMinute}`, 650, 75);
    ctx.font = '20px sans-serif';
    ctx.fillText(`ms per frame: ${msPerFrame}`, 650, 100);
    ctx.fillText(`frame counter: ${frameNum}`, 650, 125);

    CAT2_POS_X = 550;
    CAT2_POS_Y = 400;
    CAT2_HEIGHT = 448;
    CAT2_WIDTH = 448;
    CAT2_MARGIN = 30;
    ctx.fillStyle = 'rgb(0, 255, 0)';
    ctx.fillRect(CAT2_POS_X - CAT2_MARGIN, CAT2_POS_Y - CAT2_MARGIN, CAT2_HEIGHT + (CAT2_MARGIN*2), CAT2_WIDTH + (CAT2_MARGIN*2));
    ctx.drawImage(frames[frameNum], CAT2_POS_X, CAT2_POS_Y, CAT2_WIDTH, CAT2_HEIGHT);
    ctx.fillStyle = 'black';


    frameDrawTimes.push(now);
    const earliestFrameTime = frameDrawTimes.shift();
    const avgFPS = earliestFrameTime > 0 
        ? (frameDrawTimes.length / (now - earliestFrameTime)) * 1000
        : 'calculating...';
    ctx.font = '30px sans-serif';
    ctx.fillText(`avg FPS: ${avgFPS}`, 650, 40);

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
}

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

function drawVolGraph(data, graph, floor) {
    data = [...data];
    let space = 1;
    let valueMax = calculateMax(data);
    graph.push(valueMax);
    graph.shift();
    /*
    graph.forEach((value, i) => {
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'red';
        ctx.moveTo(space*i,floor-(value-1)); //x,y
        ctx.lineTo(space*i,floor-(value+1)); //x,y
        ctx.stroke();
    });
    */
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

    // find and draw peaks in vol graph
    const ANALYSIS_START = 0;
    const FRAME_INTERVAL = 20;
    const peaks = [];
    for (let i = ANALYSIS_START; i < (graph.length - FRAME_INTERVAL); i += FRAME_INTERVAL) {
        const max = { position: 0, volume: 0, drawTime: 0 };
        for (var j = i; j < (i + FRAME_INTERVAL); j++) {
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
    //console.log(JSON.stringify(peaks));
    PEAKS_FILTER_PERCENT = 0.6;
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
            const tempo = 1 / (Math.abs(filteredPeaks[idx].drawTime - filteredPeaks[i].drawTime) / 1000000);
            const group = {
                tempo,
                count: 1
            };
            if (group.tempo <= 0) {
                continue;
            }
            while (group.tempo < 70) {
                group.tempo *= 2;
            }
            while (group.tempo > 185) {
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