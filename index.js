const boardElement = document.getElementById("board");

const url = "http://codebattle-pro-2020s1.westeurope.cloudapp.azure.com/codenjoy-contest/board/player/j67i3ohb31xk9jro064c?code=6320796366256772671&gameName=snakebattle";

let client = null;

let DELTA = 12;

const initClient = () => {
  console.log('RECONNECT');
  client = new GameClient(url, {
    onUpdate: board => {},

    log: message => {
      if (message && message.includes('Err code')) {
        console.log(message);
        initClient();
      }
    }
  });
  client.run(callback);
};

let headElement = null;

let prevSteps = {};
let countSteps = 0;
let head = null;
let EVIL_TICK_COUNT = 0;
let HEAD_DEAD_COUNT = 0;

const callback = board => {
  const time = new Date();
  head = client.board.getMyHead();
  if (!head) {
    return;
  }

  if (countSteps > 40) {
    prevSteps = {};
    countSteps = 0;
  }

  countSteps++;

  if (!prevSteps[head.x]) {
    prevSteps[head.x] = {};
  }
  if (!prevSteps[head.x][head.y]) {
    prevSteps[head.x][head.y] = 0;
  }
  prevSteps[head.x][head.y] += 0.7;

  // if (client.board.getElementAt(head) === ELEMENTS.HEAD_DEAD) {
  //   НЕ работает, даже если последний в живых оставался, то умер
  //   HEAD_DEAD_COUNT++;
  //   console.log('Проиграл:', HEAD_DEAD_COUNT);
  // }

  if (!headElement || headElement === ELEMENTS.HEAD_SLEEP || client.board.getElementAt(head) === ELEMENTS.HEAD_SLEEP) {
    headElement = client.board.getElementAt(head);
    prevSteps = {};
  }

  if (EVIL_TICK_COUNT > 0) {
    EVIL_TICK_COUNT--;
  }
  // if (headElement !== ELEMENTS.HEAD_SLEEP) {
  //   console.log('HEAD', head);
  //   console.log('HEAD', headElement);
  // }
  let map = _.cloneDeep(prevSteps);
  if (headElement === ELEMENTS.HEAD_DOWN) {
    map[head.x] = { [head.y - 1]: 1000};
  } else if (headElement === ELEMENTS.HEAD_UP) {
    map[head.x] = { [head.y + 1]: 1000};
  } else if (headElement === ELEMENTS.HEAD_RIGHT) {
    map[head.x - 1] = { [head.y]: 1000};
  } else if (headElement === ELEMENTS.HEAD_LEFT) {
    map[head.x + 1] = { [head.y]: 1000};
  }

  for (let x = DELTA; x >= -DELTA; x--) {
    for (let y = DELTA; y >= -DELTA; y--) {
      const point = {
        x: head.x + x,
        y: head.y + y,
      };
      const element = client.board.getElementAt(point);
      if (!element) {
        continue;
      }
      const weight = getElementWeight(point) || 0;

      // if (headElement !== ELEMENTS.HEAD_SLEEP) {
      //   console.log(element, point, weight);
      // }
      if ([
        ELEMENTS.TAIL_END_DOWN,
        ELEMENTS.TAIL_END_LEFT,
        ELEMENTS.TAIL_END_UP, ELEMENTS.TAIL_END_RIGHT, ELEMENTS.TAIL_INACTIVE, ELEMENTS.BODY_HORIZONTAL,
        ELEMENTS.BODY_VERTICAL, ELEMENTS.BODY_LEFT_DOWN, ELEMENTS.BODY_LEFT_UP, ELEMENTS.BODY_RIGHT_DOWN
      ].includes(element)) {
        if (!map[point.x]) {
          map[point.x] = {};
        }
        if (!map[point.x][point.y]) {
          map[point.x][point.y] = 0;
        }
        map[point.x][point.y] += 5;
      } else {
          fillMap(map, weight, [point], true);
        }
    }
  }

  let directions = [
    {
      dir: DIRECTIONS.DOWN,
      weight: (map[head.x] && map[head.x][head.y + 1]) || -1,
      point: {
        x: head.x,
        y: head.y + 1,
      }
    },
    {
      dir: DIRECTIONS.UP,
      weight: (map[head.x] && map[head.x][head.y - 1]) || -1,
      point: {
        x: head.x,
        y: head.y - 1,
      }
    },
    {
      dir: DIRECTIONS.LEFT,
      weight: (map[head.x - 1] && map[head.x - 1][head.y]) || -1,
      point: {
        x: head.x - 1,
        y: head.y,
      }
    },
    {
      dir: DIRECTIONS.RIGHT,
      weight: (map[head.x + 1] && map[head.x + 1][head.y]) || -1,
      point: {
        x: head.x + 1,
        y: head.y,
      }
    },
  ];

  directions = directions.sort((a, b) => {
    return (a.weight) - (b.weight);
  });
  // if (headElement !== ELEMENTS.HEAD_SLEEP) {
  //   console.log(directions[0], directions[1], directions[2], directions[3]);
  // }


  // if (Math.abs(directions[0].weight) - Math.abs(directions[1].weight) < 2) {
  //   let dirs = [];
  //   dirs.push({dir: directions[0].dir, point: directions[0].point, weight: getWeight(map, head, directions[0].dir) + directions[0].weight});
  //   dirs.push({dir: directions[1].dir, point: directions[1].point, weight: getWeight(map, head, directions[1].dir) + directions[1].weight});
  //   dirs = dirs.sort((a, b) => {
  //     return a.weight - b.weight;
  //   });
  //   directions[0] = dirs[0];
  // }

  if (client.board.getElementAt(head) === ELEMENTS.HEAD_EVIL) {
    for (const dir of directions) {
      if (client.board.getElementAt(dir.point) === ELEMENTS.ENEMY_HEAD_EVIL) {
        directions[0] = dir;
        break;
      }
    }
  }

  if (directions[0].dir === DIRECTIONS.LEFT) {
    headElement = ELEMENTS.HEAD_LEFT;
  } else if (directions[0].dir === DIRECTIONS.RIGHT) {
    headElement = ELEMENTS.HEAD_RIGHT;
  } else if (directions[0].dir === DIRECTIONS.UP) {
    headElement = ELEMENTS.HEAD_UP;
  } else if (directions[0].dir === DIRECTIONS.DOWN) {
    headElement = ELEMENTS.HEAD_DOWN;
  }

  if (client.board.getElementAt(directions[0].point) === ELEMENTS.FURY_PILL) {
    EVIL_TICK_COUNT += EVIL_TICK_COUNT + 6;
  }


  console.log(new Date() - time, DELTA);
  if (new Date() - time < 250) {
    DELTA++;
    initWeight();
  } else if (new Date() - time > 400) {
    DELTA--;
  }

  // let text = '';
  // for (let x = 20; x >= -20; x--) {
  //   for (let y = 20; y >= -20; y--) {
  //
  //     if (x ===0 && y ===0 ) {
  //       text += `<span style="background: rgb(0,0,255);"></span>`;
  //     } else if (head.x + x === directions[0].point.x && head.y + y === directions[0].point.y ) {
  //       text += `<span style="background: rgb(255, 255, 255);"></span>`;
  //     } else if (map[head.x + x]) {
  //       let val = (map[head.x + x][head.y+y] || 0) * 10;
  //       if (val < -255) {
  //         val = -255;
  //       } else if (val > 255) {
  //         val = 255;
  //       }
  //       text += `<span style="background: rgb(${val > 0 ? val : 0},${val < 0 ? Math.abs(val) : 0}, 0);"></span>`;
  //     } else {
  //       text += `<span style="background: rgb(255, 255, 0);"></span>`;
  //     }
  //   }
  //   text += '<br/>';
  // }
  // boardElement.innerHTML = text;

  const isActing = false;
  return new Action(directions[0].dir, isActing);
};

initClient();


// const getWeight = (map, point, dir) => {
//   let result = 0;
//   if (dir === DIRECTIONS.DOWN) {
//     result += Math.min(
//       (map[point.x + 1] && map[point.x + 1][point.y + 1]) || 0,
//       (map[point.x - 1] && map[point.x - 1][point.y + 1]) || 0,
//         (map[point.x] && map[point.x][point.y + 2]) || 0,
//     );
//   } else if (dir === DIRECTIONS.UP) {
//     result += Math.min(
//       (map[point.x + 1] && map[point.x + 1][point.y - 1]) || 0,
//       (map[point.x - 1] && map[point.x - 1][point.y - 1]) || 0,
//         (map[point.x] && map[point.x][point.y - 2]) || 0,
//     );
//   } else if (dir === DIRECTIONS.RIGHT) {
//     result += Math.min(
//       (map[point.x + 1] && map[point.x + 1][point.y + 1]) || 0,
//       (map[point.x + 1] && map[point.x + 1][point.y - 1]) || 0,
//         (map[point.x + 2] && map[point.x + 2][point.y]) || 0,
//     );
//   } else if (dir === DIRECTIONS.LEFT) {
//     result += Math.min(
//       (map[point.x - 1] && map[point.x - 1][point.y + 1]) || 0,
//       (map[point.x - 1] && map[point.x - 1][point.y - 1]) || 0,
//         (map[point.x - 2] && map[point.x - 2][point.y]) || 0,
//     );
//   }
//   return result;
// };


const fillMap = (map, weight, points, first, alreadyArray) => {
  const nextPoints = [];
  if (!points.length){
    return;
  }

  if (!alreadyArray) {
    alreadyArray = {};
  }

  for (const point of points) {
    if (alreadyArray[`${point.x}|${point.y}`]) {
      continue;
    }
    if (Math.abs(weight) < 0.1) {
      continue;
    }
    if (!map[point.x]) {
      map[point.x] = {};
      map[point.x][point.y] = 0;
    }
    if (!map[point.x][point.y]) {
      map[point.x][point.y] = 0;
    }

    if (first) {
      if (weight > 0) {
        map[point.x][point.y] = 1000;
      } else {
        let r = 0;
        let p = {
          x: point.x + 1,
          y: point.y,
        };
        r += getElementWeight(p) > 0 ? 1 : 0;
        p = {
          x: point.x - 1,
          y: point.y,
        };
        r += getElementWeight(p) > 0 ? 1 : 0;
        p = {
          x: point.x,
          y: point.y + 1,
        };
        r += getElementWeight(p) > 0 ? 1 : 0;
        p = {
          x: point.x,
          y: point.y - 1,
        };
        r += getElementWeight(p) > 0 ? 1 : 0;
        if (r < 3) {
          map[point.x][point.y] = -1000;
        } else {
          map[point.x][point.y] = 1000;
          alreadyArray[`${point.x}|${point.y}`] = true;
          continue;
        }
      }
    } else {
      if (getElementWeight(point) > 0) {
        continue;
      }
      map[point.x][point.y] += weight;
    }
    alreadyArray[`${point.x}|${point.y}`] = true;
    nextPoints.push({x: point.x - 1, y: point.y},
        {x: point.x + 1, y: point.y},
        {x: point.x, y: point.y + 1},
        {x: point.x, y: point.y - 1},);
  }
  const weightOneStep = weight > 0 ? weight - 1 : weight + 1;

  fillMap(map, weightOneStep, nextPoints.filter(_ => normalBoardPoint(_)), false, alreadyArray);
};

const getElementWeight = (point) => {
  if (client.board.getElementAt(head) === ELEMENTS.HEAD_EVIL && (Math.abs(point.x - head.x) + Math.abs(point.y - head.y) < EVIL_TICK_COUNT)) {
    return ELEMENT_WEIGHT_EVIL[client.board.getElementAt(point)]
  }
  return ELEMENT_WEIGHT[client.board.getElementAt(point)];
}

const normalBoardPoint = () => {
  if (_.x > head.x + DELTA) {
    return false;
  }
  if (_.x < head.x - DELTA) {
    return false;
  }
  if (_.y > head.y + DELTA) {
    return false;
  }
  if (_.y < head.y - DELTA) {
    return false;
  }
  return true;
};


let ELEMENT_WEIGHT = null;
let ELEMENT_WEIGHT_EVIL = null;
initWeight = () => {
  ELEMENT_WEIGHT = {
    [ELEMENTS.NONE]: 0, // пустое место
    [ELEMENTS.WALL]: 2, // а это стенка
    [ELEMENTS.START_FLOOR]: 3, // место старта змей
    [ELEMENTS.OTHER]: 3, // этого ты никогда не увидишь :)

    [ELEMENTS.APPLE]: -DELTA + 3, // яблоки надо кушать от них становишься длинее
    [ELEMENTS.STONE]: 2, // а это кушать не стоит - от этого укорачиваешься
    [ELEMENTS.FLYING_PILL]: -1, // таблетка полета - дает суперсилы
    [ELEMENTS.FURY_PILL]: -DELTA + 1, // таблетка ярости - дает суперсилы
    [ELEMENTS.GOLD]: -DELTA + 2, // золото - просто очки


    [ELEMENTS.ENEMY_HEAD_DOWN]: 3,
    [ELEMENTS.ENEMY_HEAD_LEFT]: 3,
    [ELEMENTS.ENEMY_HEAD_RIGHT]: 3,
    [ELEMENTS.ENEMY_HEAD_UP]: 3,
    [ELEMENTS.ENEMY_HEAD_DEAD]: 3, // этот раунд противник проиграл
    [ELEMENTS.ENEMY_HEAD_EVIL]: DELTA, // противник скушал таблетку ярости
    [ELEMENTS.ENEMY_HEAD_FLY]: 3, // противник скушал таблетку полета
    [ELEMENTS.ENEMY_HEAD_SLEEP]: 3, // змейка противника ожидает начала раунда

    // хвосты змеек противников
    [ELEMENTS.ENEMY_TAIL_END_DOWN]: 3,
    [ELEMENTS.ENEMY_TAIL_END_LEFT]: 3,
    [ELEMENTS.ENEMY_TAIL_END_UP]: 3,
    [ELEMENTS.ENEMY_TAIL_END_RIGHT]: 3,
    [ELEMENTS.ENEMY_TAIL_INACTIVE]: 3,

    // туловище змеек противников
    [ELEMENTS.ENEMY_BODY_HORIZONTAL]: 3,
    [ELEMENTS.ENEMY_BODY_VERTICAL]: 3,
    [ELEMENTS.ENEMY_BODY_LEFT_DOWN]: 3,
    [ELEMENTS.ENEMY_BODY_LEFT_UP]: 3,
    [ELEMENTS.ENEMY_BODY_RIGHT_DOWN]: 3,
    [ELEMENTS.ENEMY_BODY_RIGHT_UP]: 3,
  };

  ELEMENT_WEIGHT_EVIL = {
    [ELEMENTS.NONE]: 0, // пустое место
    [ELEMENTS.WALL]: 2, // а это стенка
    [ELEMENTS.START_FLOOR]: 2, // место старта змей
    [ELEMENTS.OTHER]: 2, // этого ты никогда не увидишь :)

    [ELEMENTS.APPLE]: -DELTA + 5, // яблоки надо кушать от них становишься длинее
    [ELEMENTS.STONE]: -DELTA + 2, // а это кушать не стоит - от этого укорачиваешься
    [ELEMENTS.FLYING_PILL]: -DELTA + 5, // таблетка полета - дает суперсилы
    [ELEMENTS.FURY_PILL]: -DELTA + 4, // таблетка ярости - дает суперсилы
    [ELEMENTS.GOLD]: -DELTA + 4, // золото - просто очки


    [ELEMENTS.ENEMY_HEAD_DOWN]: -DELTA + 1,
    [ELEMENTS.ENEMY_HEAD_LEFT]: -DELTA + 1,
    [ELEMENTS.ENEMY_HEAD_RIGHT]: -DELTA + 1,
    [ELEMENTS.ENEMY_HEAD_UP]: -DELTA + 3,
    [ELEMENTS.ENEMY_HEAD_DEAD]: 4, // этот раунд противник проиграл
    [ELEMENTS.ENEMY_HEAD_EVIL]: 4, // противник скушал таблетку ярости
    [ELEMENTS.ENEMY_HEAD_FLY]: 4, // противник скушал таблетку полета
    [ELEMENTS.ENEMY_HEAD_SLEEP]: 4, // змейка противника ожидает начала раунда

    // хвосты змеек противников
    [ELEMENTS.ENEMY_TAIL_END_DOWN]: 4,
    [ELEMENTS.ENEMY_TAIL_END_LEFT]: 4,
    [ELEMENTS.ENEMY_TAIL_END_UP]: 4,
    [ELEMENTS.ENEMY_TAIL_END_RIGHT]: 4,
    [ELEMENTS.ENEMY_TAIL_INACTIVE]: 4,

    // туловище змеек противников
    [ELEMENTS.ENEMY_BODY_HORIZONTAL]: -DELTA + 2,
    [ELEMENTS.ENEMY_BODY_VERTICAL]: -DELTA + 2,
    [ELEMENTS.ENEMY_BODY_LEFT_DOWN]: -DELTA + 2,
    [ELEMENTS.ENEMY_BODY_LEFT_UP]: -DELTA + 2,
    [ELEMENTS.ENEMY_BODY_RIGHT_DOWN]: -DELTA + 2,
    [ELEMENTS.ENEMY_BODY_RIGHT_UP]: -DELTA + 2,
  };

};
initWeight();
