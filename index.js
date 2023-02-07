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
};

const answerLetterCounts = countLetters(answerWords);

const guesses = [];
let guessValid = true;
let win = false;
while (!win) {
  win = loop();
}
console.log('');
guesses.forEach(guess => printGuess(guess));
console.log('\nyou win');
console.log(`${guesses.length} guesses`);

function loop() {
  console.clear();
  if (!guessValid) {
    console.log(chalk.red('enter a real word loser'));
    console.log('');
    guessValid = true;
  }

  printKeyboard();
  console.log('');
  guesses.forEach(guess => printGuess(guess));

  const guess = getGuess();
  if (!guess) {
    guessValid = false;
    return;
  }
  guesses.push(guess);
  if (isAllGreen(guess.coloring)) {
    return true;
  }
  return false;
}

function isAllGreen(coloring) {
  return coloring.every(color => color === colors.green);
}

function printKeyboard() {
  const rows = [
    'QWERTYUIOP'.split(''),
    'ASDFGHJKL'.split(''),
    'ZXCVBNM'.split(''),
  ];
  rows.forEach(row => {
    let rowString = '';
    row.forEach(letter => {
      let letterColor = undefined;
      guesses.forEach(guess => {
        guess.word.split('').forEach((guessLetter, index) => {
          if (guessLetter !== letter) {
            return;
          }
          if (letterColor === colors.green) {
            return;
          }
          if (guess.coloring[index] === colors.green) {
            letterColor = colors.green;
            return;
          }
          if (letterColor === colors.orange) {
            return;
          }
          if (guess.coloring[index] === colors.orange) {
            letterColor = colors.orange;
            return;
          }
          if (guess.coloring[index] === colors.grey) {
            letterColor = colors.grey;
          }
        });
      });
      if (letterColor === colors.green) {
        rowString += chalk.green(letter);
        return;
      }
      if (letterColor === colors.orange) {
        rowString += chalk.rgb(255, 172, 28)(letter);
        return;
      }
      if (letterColor === colors.grey) {
        rowString += chalk.red(letter);
        return;
      }
      rowString += letter;
    });
    console.log(rowString);
  });
}

function printGuess(guess) {
  const word = guess.word;
  let toPrint = '';
  word.split('').forEach((letter, index) => {
    if (guess.coloring[index] === colors.green) {
      toPrint += chalk.green(letter);
      return;
    }
    if (guess.coloring[index] === colors.orange) {
      toPrint += chalk.rgb(255, 172, 28)(letter);
      return;
    }
    toPrint += letter;
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
  const constraints = new Map();
  const aCode = 65;
  for (let i = 0; i < 26; i++) {
    constraints.set(String.fromCharCode(aCode + i), getDefault());
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
