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

module.exports.randomString = randomString;
module.exports.randomNumber = randomNumber;