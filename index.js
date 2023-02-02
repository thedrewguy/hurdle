const wordList = require('./words').map(word => word.toUpperCase());

const colors = {
  green: 'green',
  orange: 'orange',
  grey: 'grey',
};

const wordMap = makeWordMap(wordList);

const guess = {};
guess.word = 'PUPPY';
guess.coloring = [
  colors.green,
  colors.grey,
  colors.grey,
  colors.grey,
  colors.orange,
];
guess.constraints = getConstraints(guess);

const validWords = wordList.filter(word => fitsGuess(word, guess));

function fitsGuess(word, guess) {
  const letters = word.split('');

  if (
    !letters.every((letter, index) => {
      const guessLetter = guess.word.split('')[index];
      if (guess.coloring[index] === colors.green && letter !== guessLetter) {
        return false;
      }

      if (guess.coloring[index] === colors.orange && letter === guessLetter) {
        return false;
      }

      return true;
    })
  ) {
    return false;
  }

  const letterCounts = wordMap.get(word);
  const letterCountIsOk = [...letterCounts].every(([letter, count]) => {
    const { min, max } = guess.constraints.get(letter);
    return count >= min && count <= max;
  });

  return letterCountIsOk;
}

function makeWordMap(wordList) {
  const wordMap = new Map();
  wordList.forEach(word => {
    const letterCounts = new Map();
    word.split('').forEach(letter => {
      const letterCount = letterCounts.get(letter);
      if (letterCount) {
        letterCounts.set(letter, letterCount + 1);
        return;
      }
      letterCounts.set(letter, 1);
    });
    wordMap.set(word, letterCounts);
  });
  return wordMap;
}

function defaultLetterConstraints() {
  const constraints = new Map();
  const aCode = 65;
  for (let i = 0; i < 26; i++) {
    constraints.set(String.fromCharCode(aCode + i), { min: 0, max: 5 });
  }
  return constraints;
}

function getLetterColorCounts(guess) {
  const letterColorCounts = new Map();
  guess.word.split('').forEach((letter, index) => {
    let colorCounts = letterColorCounts.get(letter);
    if (!colorCounts) {
      colorCounts = { grey: 0, greenish: 0 };
      letterColorCounts.set(letter, colorCounts);
    }
    if (guess.coloring[index] === colors.grey) {
      colorCounts.grey++;
      return;
    }
    colorCounts.greenish++;
  });
  return letterColorCounts;
}

function getConstraints(guess) {
  const guessConstraints = defaultLetterConstraints();

  const letterColorCounts = getLetterColorCounts(guess);

  [...letterColorCounts].forEach(([letter, counts]) => {
    if (counts.grey > 0) {
      guessConstraints.get(letter).max = counts.greenish;
    }
    if (counts.greenish > 0) {
      guessConstraints.get(letter).min = counts.greenish;
    }
  });

  return guessConstraints;
}
