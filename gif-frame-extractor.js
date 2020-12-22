import gifFrames from 'gif-frames';
import { createWriteStream } from 'fs';

gifFrames({ url: 'images/catjam.gif', frames: 'all', outputType: 'png'})
    .then(function (frameData) {
        frameData.forEach((frame) => {
            frame.getImage().pipe(createWriteStream(`images/frames/catjam-frame-${frame.frameIndex}.png`));
        });
    });