// 물리엔진을 구현하는 라이브러리인 Matter.js가 로드가 되지 않았다면 콘솔에 에러를 뜨게 하는 코드를 작성해봅시다!
// 콘솔에 에러 로그를 남기려면 어떤 메서드를 이용해야 한다고 했었죠?

const Engine = Matter.Engine; 
const Render = Matter.Render;
const Runner = Matter.Runner;
const Bodies = Matter.Bodies; 
const Composite = Matter.Composite; 
const Events = Matter.Events; 
const Mouse = Matter.Mouse; 
const MouseConstraint = Matter.MouseConstraint; 

const GAME_WIDTH = 640; 
const GAME_HEIGHT = 960; 
const WALL_THICKNESS = 64;
const LOSE_LINE_HEIGHT = 84; 
const STATUS_BAR_HEIGHT = 48; 
const PREVIEW_BALL_HEIGHT = 32; 

const FRUIT_PHYSICS = {
    friction: 0.006,
    frictionStatic: 0.006, 
    frictionAir: 0, 
    restitution: 0.1 
};

const GAME_STATE = {
    READY: 'ready', 
    DROP: 'drop', 
    LOSE: 'lose'
};

const gameCanvas = document.getElementById('game-canvas');
const gameUI = document.getElementById('game-ui');
const gameScoreElement = document.getElementById('game-score');
const gameEndContainer = document.getElementById('game-end-container');
const gameEndTitle = document.getElementById('game-end-title');
const gameHighscoreValue = document.getElementById('game-highscore-value');
const gameNextFruitImg = document.getElementById('game-next-fruit');

let currentGameState = GAME_STATE.READY; 
let currentScore = 0;
let fruitsMergedCount = []; 
let highscore = 0; 
let currentDroppingFruitSizeIndex = 0; 
let nextDroppingFruitSizeIndex = 0; 
let previewFruitBody = null;

const FRUIT_DATA = [
    { radius: 24,  scoreValue: 1,  img: './assets/img/circle0.png'  },
    { radius: 32,  scoreValue: 3,  img: './assets/img/circle1.png'  },
    { radius: 40,  scoreValue: 6,  img: './assets/img/circle2.png'  },
    { radius: 56,  scoreValue: 10, img: './assets/img/circle3.png'  },
    { radius: 64,  scoreValue: 15, img: './assets/img/circle4.png'  },
    { radius: 72,  scoreValue: 21, img: './assets/img/circle5.png'  },
    { radius: 84,  scoreValue: 28, img: './assets/img/circle6.png'  },
    { radius: 96,  scoreValue: 36, img: './assets/img/circle7.png'  },
    { radius: 128, scoreValue: 45, img: './assets/img/circle8.png'  },
    { radius: 160, scoreValue: 55, img: './assets/img/circle9.png'  },
    { radius: 192, scoreValue: 66, img: './assets/img/circle10.png' },
];

const gameSounds = {
    click: new Audio('./assets/click.mp3'),
    pop: [
        new Audio('./assets/pop0.mp3'),
        new Audio('./assets/pop1.mp3'),
        new Audio('./assets/pop2.mp3'),
        new Audio('./assets/pop3.mp3'),
        new Audio('./assets/pop4.mp3'),
        new Audio('./assets/pop5.mp3'),
        new Audio('./assets/pop6.mp3'),
        new Audio('./assets/pop7.mp3'),
        new Audio('./assets/pop8.mp3'),
        new Audio('./assets/pop9.mp3'),
        new Audio('./assets/pop10.mp3'),
    ]
};

const engine = Engine.create();
const world = engine.world;

const render = Render.create({
    element: gameCanvas,
    engine: engine, 
    options: {
        width: GAME_WIDTH, 
        height: GAME_HEIGHT, 
        wireframes: false, 
        background: '#ffdcae'
    }
});

const runner = Runner.create();

const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse, 
    constraint: {
        stiffness: 0, 
        render: {
            visible: false 
        }
    },
    collisionFilter: { 
        mask: 0x0000 
    }
});
Composite.add(world, mouseConstraint);
render.mouse = mouse; 

function initializeGame() {
    Render.run(render);
    Runner.run(runner, engine);

    loadHighscore();

    fruitsMergedCount = Array(FRUIT_DATA.length).fill(0);

    currentScore = 0;
    gameScoreElement.innerText = currentScore;

    startGame();
}

function startGame() {
    // 게임을 시작하는 함수입니다. 

    setupGameStatics();

    gameUI.style.display = 'block';
    gameEndContainer.style.display = 'none';
    gameEndTitle.innerText = 'Game Over!';

    setNextFruitSize();

    previewFruitBody = createFruitBody(GAME_WIDTH / 2, PREVIEW_BALL_HEIGHT, currentDroppingFruitSizeIndex, { isStatic: true });
    Composite.add(world, previewFruitBody);

    setTimeout(() => {
        currentGameState = GAME_STATE.READY;
    }, 250);
    
    // 과일을 떨어뜨리는 마우스 클릭 이벤트 리스너 코드를 작성해봅시다.

    // 미리보기 과일 위치를 업데이트하는 마우스 이동 이벤트 리스너 코드를 작성해봅시다.
    
    // 과일 합치기 및 게임 오버를 감지하는 충돌 이벤트 리스너 코드를 작성해봅시다.

    Events.on(engine, 'afterUpdate', checkGameOver);
}

function setupGameStatics() {
    const wallProps = {
        isStatic: true, 
        render: { fillStyle: '#FFEEDB' }, 
        ...FRUIT_PHYSICS, 
    };

    const gameStatics = [
        Bodies.rectangle(-(WALL_THICKNESS / 2), GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT, wallProps),
        Bodies.rectangle(GAME_WIDTH + (WALL_THICKNESS / 2), GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT, wallProps),
        Bodies.rectangle(GAME_WIDTH / 2, GAME_HEIGHT + (WALL_THICKNESS / 2) - STATUS_BAR_HEIGHT, GAME_WIDTH, WALL_THICKNESS, wallProps),
    ];
    Composite.add(world, gameStatics); 
}

function createFruitBody(x, y, sizeIndex, extraConfig = {}) {
    const fruit = FRUIT_DATA[sizeIndex]; 
    const circle = Bodies.circle(x, y, fruit.radius, {
        ...FRUIT_PHYSICS,
        ...extraConfig, 
        render: {
            sprite: {
                texture: fruit.img,
                xScale: fruit.radius / 512,
                yScale: fruit.radius / 512,
            }
        },
    });
    circle.sizeIndex = sizeIndex; 
    circle.isPopped = false; 
    return circle;
}

function setNextFruitSize() {
    // 다음에 떨어뜨릴 과일의 크기를 설정하는 함수의 코드를 작성해봅시다.

    // 0부터 4까지의 랜덤한 과일 크기 인덱스를 가장 작은 5가지 과일 중 선택하고,
    // 다음에 떨어뜨릴 과일 이미지를 업데이트합니다.
}

function addFruit(xPosition) {
    // 과일을 떨어뜨리는 함수입니다.

    // 게임 상태가 '준비'가 아니면 함수의 실행을 중단하는 코드를 작성해봅시다.

    gameSounds.click.play();
    currentGameState = GAME_STATE.DROP;

    // 현재 떨어뜨릴 과일을 생성하는 코드를 작성해봅시다. (HINT: 물리세계에 과일을 추가하는 로직이 있어야 해요!)

    currentDroppingFruitSizeIndex = nextDroppingFruitSizeIndex;
    setNextFruitSize();

    Composite.remove(world, previewFruitBody);

    setTimeout(() => {
        
        if (currentGameState !== GAME_STATE.LOSE) {
            previewFruitBody = createFruitBody(xPosition, PREVIEW_BALL_HEIGHT, currentDroppingFruitSizeIndex, {
                isStatic: true,
                collisionFilter: { mask: 0x0040 }
            });
            Composite.add(world, previewFruitBody);

            // 게임 상태를 다시 '준비'로 변경하는 코드를 작성해봅시다.
        }
    }, 500);
}

function handleFruitDrop(event) {
    // 마우스 클릭 위치의 x좌표의 위치에 과일을 떨어뜨리는 코드를 작성해봅시다!
}

function handleFruitPreviewMove(event) {
    // 게임 상태가 '준비'이고 미리보기 과일이 존재하면,
    // 미리보기 과일의 x좌표를 마우스의 x좌표로 업데이트하는 코드를 작성해봅시다!
}

function calculateScore() {
    let newScore = 0;
    // 합쳐진 과일 횟수를 기반으로 점수를 계산하는 코드를 작성해봅시다!
    currentScore = newScore;
    gameScoreElement.innerText = currentScore;
}

function loadHighscore() {
    const savedCache = localStorage.getItem('suika-game-cache');
    if (savedCache) {
        const cacheData = JSON.parse(savedCache);
        highscore = cacheData.highscore || 0;
    }
    gameHighscoreValue.innerText = highscore;
}

function saveHighscore() {
    calculateScore(); 
    if (currentScore > highscore) {
        highscore = currentScore; 
        gameHighscoreValue.innerText = highscore;
        gameEndTitle.innerText = 'New Highscore!';
        localStorage.setItem('suika-game-cache', JSON.stringify({ highscore: highscore })); 
    }
}

function handleCollision(event) {
    const pairs = event.pairs; 

    pairs.forEach(pair => {
        const { bodyA, bodyB } = pair; 

        if (bodyA.isStatic || bodyB.isStatic) {
            return;
        }

        if (bodyA.sizeIndex !== bodyB.sizeIndex) return;

        if (bodyA.isPopped || bodyB.isPopped) return;

        mergeFruits(bodyA, bodyB);
    });
}

function checkGameOver() {
    if (currentGameState !== GAME_STATE.LOSE) {
        const bodies = Composite.allBodies(engine.world);
        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];
            if (!body.isStatic && body !== previewFruitBody && body.position.y - body.circleRadius < LOSE_LINE_HEIGHT) {
                const velocity = Math.sqrt(body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y);
                const angularVelocity = Math.abs(body.angularVelocity);
                
                if (velocity < 0.1 && angularVelocity < 0.1) {
                    loseGame();
                    return;
                }
            }
        }
    }
}

function mergeFruits(fruit1, fruit2) {
    // 과일 합치기 함수입니다.

    fruit1.isPopped = true;
    fruit2.isPopped = true;

    let newSizeIndex = fruit1.sizeIndex + 1;

    if (newSizeIndex >= FRUIT_DATA.length) {
        newSizeIndex = FRUIT_DATA.length - 1;
    }

    // 합쳐진 과일 횟수를 업데이트하는 코드를 작성해봅시다.

    gameSounds.pop[fruit1.sizeIndex].play();

    const midPosX = (fruit1.position.x + fruit2.position.x) / 2;
    const midPosY = (fruit1.position.y + fruit2.position.y) / 2;

    Composite.remove(world, [fruit1, fruit2]);

    const newFruit = createFruitBody(midPosX, midPosY, newSizeIndex);
    Composite.add(world, newFruit);

    // 점수를 업데이트 하는 코드를 작성해봅시다. 아까 선언한 함수 중 어떤 걸 이용해야할지 잘 생각해보새요!

    addPopEffect(midPosX, midPosY, fruit1.radius);
}

function addPopEffect(x, y, radius) {
    const popCircle = Bodies.circle(x, y, radius, {
        isStatic: true, 
        collisionFilter: { mask: 0x0040 },
        render: {
            sprite: {
                texture: './assets/img/pop.png',
                xScale: radius / 384,
                yScale: radius / 384,
            }
        },
    });

    Composite.add(world, popCircle); 

    setTimeout(() => {
        Composite.remove(world, popCircle);
    }, 100);
}

function loseGame() {
    // 게임 오버 함수입니다.

    currentGameState = GAME_STATE.LOSE;
    gameEndContainer.style.display = 'flex'; 
    runner.enabled = false;
    saveHighscore(); 

    Events.off(mouseConstraint, 'mouseup', handleFruitDrop);
    Events.off(mouseConstraint, 'mousemove', handleFruitPreviewMove);
    Events.off(engine, 'collisionStart', handleCollision);
    Events.off(engine, 'afterUpdate', checkGameOver);

    // '다시 시도' 버튼 클릭 시 페이지가 새로고침이 되도록 코드를 작성해봅시다.
}

function resizeCanvas() {
    const screenWidth = document.body.clientWidth; 
    const screenHeight = document.body.clientHeight; 

    let newWidth = GAME_WIDTH;
    let newHeight = GAME_HEIGHT;
    let uiScale = 1;

    if (screenWidth * 1.5 > screenHeight) {
        newHeight = Math.min(GAME_HEIGHT, screenHeight);
        newWidth = newHeight / 1.5; 
        uiScale = newHeight / GAME_HEIGHT;
    } else { 
        newWidth = Math.min(GAME_WIDTH, screenWidth);
        newHeight = newWidth * 1.5;
        uiScale = newWidth / GAME_WIDTH;
    }

    render.canvas.style.width = `${newWidth}px`;
    render.canvas.style.height = `${newHeight}px`;

    gameUI.style.width = `${GAME_WIDTH}px`;
    gameUI.style.height = `${GAME_HEIGHT}px`;
    gameUI.style.transform = `scale(${uiScale})`;
}

document.body.onload = initializeGame; 
window.addEventListener('resize', resizeCanvas); 

resizeCanvas();
