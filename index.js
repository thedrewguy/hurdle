import getPrompt from 'prompt-sync';
const prompt = getPrompt();

import aw from './answer-words.js';
const answerWords = aw.map(word => word.toUpperCase());

import gw from './guess-words.js';
const guessWords = gw.map(word => word.toUpperCase());

import chalk from 'chalk';

const colors = {
  green: 'green',
  orange: 'orange',
  grey: 'grey',
  white: 'white',
};

const colorPrint = {
  [colors.green]: chalk.rgb(0, 255, 0),
  [colors.orange]: chalk.rgb(255, 172, 28),
  [colors.grey]: chalk.white,
  [colors.white]: chalk.whiteBright,
};

const colorRank = {
  [colors.green]: 4,
  [colors.orange]: 3,
  [colors.grey]: 2,
  [colors.white]: 1,
};

const answerLetterCounts = countLetters(answerWords);

const guesses = [];
let guessValid = true;
let win = false;
while (!win) {
  win = loop();
}
console.log('');
console.log('\nyou win');
console.log(`${guesses.length} guesses`);

function loop() {
  console.clear();
  if (!guessValid) {
    console.log(chalk.redBright('enter a real word loser'));
    console.log('');
    guessValid = true;
  }

  printKeyboard();
  console.log('');
  guesses.forEach(guess => printGuess(guess));

  const lastGuess = guesses[guesses.length - 1];
  if (lastGuess && isAllGreen(lastGuess.coloring)) {
    return true;
  }

  const guess = getGuess();
  if (!guess) {
    guessValid = false;
    return;
  }

  guesses.push(guess);
}

function isAllGreen(coloring) {
  return coloring.every(color => color === colors.green);
}

function printKeyboard() {
  const keyboardColoring = defaultLetterMap(() => colors.white);

  guesses.forEach(guess => {
    guess.word.split('').forEach((guessLetter, index) => {
      const currentColor = keyboardColoring.get(guessLetter);
      const guessLetterColor = guess.coloring[index];
      if (colorRank[guessLetterColor] > colorRank[currentColor]) {
        keyboardColoring.set(guessLetter, guessLetterColor);
      }
    });
  });

  const rows = [
    'QWERTYUIOP'.split(''),
    'ASDFGHJKL'.split(''),
    'ZXCVBNM'.split(''),
  ];
  rows.forEach(row => {
    let rowString = '';
    row.forEach(letter => {
      const letterColor = keyboardColoring.get(letter);
      rowString += colorPrint[letterColor](letter);
    });
    console.log(rowString);
  });
}

function printGuess(guess) {
  const word = guess.word;
  let toPrint = '';
  word.split('').forEach((letter, index) => {
    toPrint += colorPrint[guess.coloring[index]](letter);
  });
  console.log(toPrint);
}

function getGuess() {
  const guessWord = prompt('').toUpperCase();

  if (!guessWords.includes(guessWord)) {
    return;
  }

  const guess = {};
  guess.word = guessWord;

  const validAnswers = remainingValidAnswers(guesses);
  guess.coloring = chooseColoring(validAnswers, guessWord);

  guess.constraints = getConstraints(guess);

  return guess;
}

function chooseColoring(validAnswers, nextGuess) {
  const answerColorings = validAnswers.map(word => ({
    word: word,
    coloringString: JSON.stringify(answerColoring(nextGuess, word)),
  }));

  const coloringCounts = {};
  answerColorings.forEach(({ coloringString }) => {
    coloringCounts[coloringString] = (coloringCounts[coloringString] ?? 0) + 1;
    if (isAllGreen(JSON.parse(coloringString))) {
      coloringCounts[coloringString] = -1;
    }
  });
  const commonestColoring = JSON.parse(
    Object.entries(coloringCounts).sort((a, b) => b[1] - a[1])[0][0]
  );

  return commonestColoring;
}

function remainingValidAnswers(guesses) {
  let validAnswers = [...answerWords];
  guesses.forEach(guess => {
    validAnswers = validAnswers.filter(answer => fitsGuess(answer, guess));
  });
  return validAnswers;
}

function answerColoring(guessWord, answer) {
  const guessLetterCounts = {};
  const greenColoring = answer.split('').map((answerLetter, index) => {
    const guessLetter = guessWord.split('')[index];
    if (guessLetter !== answerLetter) {
      return;
    }

    guessLetterCounts[guessLetter] = (guessLetterCounts[guessLetter] ?? 0) + 1;

    return colors.green;
  });

  const coloring = greenColoring.map((color, index) => {
    if (color === colors.green) {
      return colors.green;
    }

    const guessLetter = guessWord.split('')[index];

    let guessLetterCount = (guessLetterCounts[guessLetter] ?? 0) + 1;
    guessLetterCounts[guessLetter] = guessLetterCount;

    if (guessLetterCount <= answerLetterCounts.get(answer).get(guessLetter)) {
      return colors.orange;
    }
    return colors.grey;
  });

  return coloring;
}

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

  const letterCounts = answerLetterCounts.get(word);
  const letterCountIsOk = [...letterCounts].every(([letter, count]) => {
    const { min, max } = guess.constraints.get(letter);
    return count >= min && count <= max;
  });

  return letterCountIsOk;
}

function countLetters(wordList) {
  const wordLetterCounts = new Map();
  wordList.forEach(word => {
    const letterCounts = defaultLetterMap(() => 0);

    word
      .split('')
      .forEach(letter =>
        letterCounts.set(letter, letterCounts.get(letter) + 1)
      );
    wordLetterCounts.set(word, letterCounts);
  });
  return wordLetterCounts;
}

function defaultLetterMap(getDefault) {
  const letterMap = new Map();
  const aCode = 65;
  for (let i = 0; i < 26; i++) {
    letterMap.set(String.fromCharCode(aCode + i), getDefault());
  }
  return letterMap;
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
  const guessConstraints = defaultLetterMap(() => ({ min: 0, max: 5 }));

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
