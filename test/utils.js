function randomString(size) {
    var string = '',
        start = 97,
        alphabetLength = 26,
        end = start + alphabetLength,
        i;

    for (i = 0; i < size; i++) {
        string += String.fromCharCode(
            randomNumber(start, end));
    }
    return string;
}

function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

function performanceTest(fn, times, text) {
    times = times !== undefined ? times : 1;
    text = text !== undefined ? text : 'Default test';

    var start = Date.now();
    var i;

    for(i = 0; i < times; i++) {
        fn();
    }
    console.log(text + ' finished in: ' + (Date.now() - start) + 'ms');
}

module.exports.randomString = randomString;
module.exports.randomNumber = randomNumber;
module.exports.performanceTest = performanceTest;