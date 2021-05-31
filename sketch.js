// Bakeoff #3 - Escrita em Smartwatches
// IPM 2020-21, Semestre 2
// Entrega: até dia 4 de Junho às 23h59 através do Fenix
// Bake-off: durante os laboratórios da semana de 31 de Maio

// p5.js reference: https://p5js.org/reference/

// Database (CHANGE THESE!)
const GROUP_NUMBER = 17;      // add your group number here as an integer (e.g., 2, 3)
const BAKE_OFF_DAY = false;  // set to 'true' before sharing during the simulation and bake-off day

let PPI, PPCM;                 // pixel density (DO NOT CHANGE!)
let second_attempt_button;     // button that starts the second attempt (DO NOT CHANGE!)

// Finger parameters (DO NOT CHANGE!)
let finger_img;                // holds our finger image that simules the 'fat finger' problem
let FINGER_SIZE, FINGER_OFFSET;// finger size and cursor offsett (calculated after entering fullscreen)

// Arm parameters (DO NOT CHANGE!)
let arm_img;                   // holds our arm/watch image
let ARM_LENGTH, ARM_HEIGHT;    // arm size and position (calculated after entering fullscreen)

// Study control parameters (DO NOT CHANGE!)
let draw_finger_arm = false;  // used to control what to show in draw()
let phrases = [];     // contains all 501 phrases that can be asked of the user
let current_trial = 0;      // the current trial out of 2 phrases (indexes into phrases array above)
let attempt = 0       // the current attempt out of 2 (to account for practice)
let target_phrase = "";     // the current target phrase
let currently_typed = "";     // what the user has typed so far
let entered = new Array(2); // array to store the result of the two trials (i.e., the two phrases entered in one attempt)
let CPS = 0;      // add the characters per second (CPS) here (once for every attempt)

// Metrics
let attempt_start_time, attempt_end_time; // attemps start and end times (includes both trials)
let trial_end_time;            // the timestamp of when the lastest trial was completed
let letters_entered = 0;      // running number of letters entered (for final WPM computation)
let letters_expected = 0;      // running number of letters expected (from target phrase)
let errors = 0;      // a running total of the number of errors (when hitting 'ACCEPT')
let database;                  // Firebase DB

let xBaseScreen;
let yBaseScreen;
let wBaseScreen;
let hBaseScreen;
let baseScreen;

let wButton;
let hButton;

let choice = '';
let hasSwiped = false;
let clickTime = 0;
let currentLetter = '';
let letterPos = 0;
let tutorial;

let autocompleteWords = [];
let completeWord = ["", "", ""];

let screen1 = true;

let xHighlight = 0;
let yHighlight = 0;
let wHighlight = 0;
let highlightStart;
let highlightFinish;

// Runs once before the setup() and loads our data (images, phrases)
function preload() {
  // Loads simulation images (arm, finger) -- DO NOT CHANGE!
  arm = loadImage("data/arm_watch.png");
  fingerOcclusion = loadImage("data/finger.png");

  // Loads the target phrases (DO NOT CHANGE!)
  phrases = loadStrings("data/phrases.txt");

  autocompleteWords = loadStrings("data/palavras.txt");

  baseScreen1 = loadImage("images/qwerty1.jpg");
  baseScreen2 = loadImage("images/qwerty2.jpg");
  tutorialImage = loadImage("images/tutorial.png")

  baseScreen = baseScreen1;

  // Loads sounds
  keypress = loadSound('sounds/keypress.mp3');
}

// Runs once at the start
function setup() {
  createCanvas(windowWidth, windowHeight);   // window size in px before we go into fullScreen()
  frameRate(60);            // frame rate (DO NOT CHANGE!)

  // DO NOT CHANGE THESE!
  shuffle(phrases, true);   // randomize the order of the phrases list (N=501)
  target_phrase = phrases[current_trial];

  drawUserIDScreen();       // draws the user input screen (student number and display size)

  // set options to prevent default behaviors for swipe, pinch, etc
  var options = {
    preventDefault: true
  };

  // document.body registers gestures anywhere on the page
  var hammer = new Hammer(document.body, options);
  hammer.get('swipe').set({
    direction: Hammer.DIRECTION_ALL
  });

  hammer.on("swipe", swiped);
"
  button = createButton("I'm ready");
  button.mousePressed(startFirstAttempt);
}

// Hammer swipe event
function swiped(event) {

  let x = event.changedPointers[0].screenX - event.deltaX;
  let y = event.changedPointers[0].screenY - event.deltaY;

  hasSwiped = true;
  // SWIPE UP - AUTOCOMPLETE
  if (event.direction == 8 && completeWord != "") {
    if (x < xBaseScreen || x > xBaseScreen + wBaseScreen) {
      return;
    }

    if (x > xBaseScreen && x < xBaseScreen + 4 / 3 * PPCM) {
      currently_typed += completeWord[0].substring(currently_typed.split(" ").pop().length) + " ";
      completeWord = ["", "", ""];
      keypress.stop();
      keypress.play();
    } else if (x > xBaseScreen + 4 / 3 * PPCM && x < xBaseScreen + 8 / 3 * PPCM) {
      currently_typed += completeWord[1].substring(currently_typed.split(" ").pop().length) + " ";
      completeWord = ["", "", ""];
      keypress.stop();
      keypress.play();
    } else if (x > xBaseScreen + 8 / 3 * PPCM && x < xBaseScreen + 12 / 3 * PPCM) {
      currently_typed += completeWord[2].substring(currently_typed.split(" ").pop().length) + " ";
      completeWord = ["", "", ""];
      keypress.stop();
      keypress.play();
    }

  }

  // SWIPE LEFT
  if (event.direction == 2) {
    if (y < yBaseScreen || y > yBaseScreen + hBaseScreen) {
      return;
    }
    screen1 = !screen1;
    if (screen1) {
      baseScreen = baseScreen1;

    } else {
      baseScreen = baseScreen2;
    }
  }

  // SWIPE RIGHT 
  if (event.direction == 4) {
    if (y < yBaseScreen || y > yBaseScreen + hBaseScreen) {
      return;
    }
    screen1 = !screen1;
    if (screen1) {
      baseScreen = baseScreen1;

    } else {
      baseScreen = baseScreen2;
    }
  }
}

function draw() {

  if (draw_finger_arm) {
    background(255);           // clear background
    noCursor();                // hides the cursor to simulate the 'fat finger'

    drawArmAndWatch();         // draws arm and watch background
    writeTargetAndEntered();   // writes the target and entered phrases above the watch
    drawACCEPT();              // draws the 'ACCEPT' button that submits a phrase and completes a trial

    // Draws the non-interactive screen area (4x1cm) -- DO NOT CHANGE SIZE!
    noStroke();
    fill(35, 35, 35);
    rect(width / 2 - 2.0 * PPCM, height / 2 - 2.0 * PPCM, 4.0 * PPCM, 1.0 * PPCM);

    textFont("Arial", 12);
    fill(255, 255, 255);

    textAlign(CENTER, CENTER);

    let i = 0;
    for (let c of completeWord){
  
      if (c.length > 8) {
        c = c.substring(0,ceil(c.length/2)) + "-\n-" + c.substring(ceil(c.length/2));
      }

      text(c, width / 2 - (1.2 - i * 1.3) * PPCM, height / 2 - 1.45 * PPCM);

      i++;
    }

    fill(0);

    // Draws the touch input area (4x3cm) -- DO NOT CHANGE SIZE!
    stroke(255, 255, 255);
    noFill();
    rect(xBaseScreen, yBaseScreen, wBaseScreen, hBaseScreen);
    noStroke();

    draw2Dkeyboard();       // draws our basic 2D keyboard UI
    
    highlightFinish = millis();

    if (highlightFinish - highlightStart < 100) {
      noStroke();
      fill(0, 0, 0, 100);
      rect(xHighlight, yHighlight, wHighlight, hButton);
    }
    
    drawFatFinger();        // draws the finger that simulates the 'fat finger' problem

  }

  else if(tutorial){
    background(0); 
    imageMode(CENTER);
    image(tutorialImage, width/2, 4 * height/10,12*PPCM,12*PPCM);
    button.position(width/2, 4*height/5);
  }
}


function startFirstAttempt(){
  // Starts drawing the watch immediately after we go fullscreen (DO NO CHANGE THIS!)
  button.remove();
  tutorial = false;
  draw_finger_arm = true;
  attempt_start_time = millis();
}


// Draws 2D keyboard UI 
function draw2Dkeyboard() {
  noFill();
  imageMode(CORNER);
  image(baseScreen, xBaseScreen, yBaseScreen, wBaseScreen, hBaseScreen)
}

function autocomplete() {
  //Autocomplete
  let word = currently_typed.split(" ").pop();
  let i = 0;

  for (let c of autocompleteWords) {
    if (c.length < word.length) {
      continue;
    }

    let prefix = c.substring(0, word.length);
    if (prefix == word) {
      completeWord[i] = c;
      i++
      if (i == 3) {
        break;
      }
    }
  }
}


// Transforms mouse coordinates into the button clicked 
function mouseClickButton() {
  let x = floor((mouseX - xBaseScreen) / wButton);
  let y = floor((mouseY - yBaseScreen) / hButton);

  if (screen1) {
    buttons = [
      ['q', 'w', 'e', 'r', 't'],
      ['a', 's', 'd', 'f', 'g'],
      ['z', 'x', 'c', 'v', 'b'],
      ['back', 'back', 'space', 'space', 'space']
    ];
  } else {
    buttons = [
      ['y', 'u', 'i', 'o', 'p'],
      ['h', 'j', 'k', 'l', ''],
      ['n', 'm', '', '', ''],
      ['back', 'back', 'space', 'space', 'space']
    ];
  }

  if (buttons[y][x] != '') {
    let size = 1;

    if(buttons[y][x] == 'back'){
      size = 2;
      x = 0;
      y = 3;
    
    }else if(buttons[y][x] == 'space'){
      size = 3;
      x = 2;
      y = 3;
    }
    xHighlight = xBaseScreen + x * wButton
    yHighlight = yBaseScreen + y * hButton
    wHighlight = size * wButton;
    highlightStart = millis();
  }


  return buttons[y][x];
}

// Evoked when the mouse button was clicked
function mouseClicked() {
  if (hasSwiped) { // ignore mouse clicks "during" swipe
    hasSwiped = false;
    return;
  }

  // Only look for mouse presses during the actual test
  if (draw_finger_arm) {
    // Check if mouse click happened within the touch input area
    if (mouseClickWithin(width / 2 - 2.0 * PPCM, height / 2 - 1.0 * PPCM, 4.0 * PPCM, 3.0 * PPCM)) {

      let delay = millis() - clickTime;

      switch (c = mouseClickButton()) {
        case 'back': // delete last character typed
          if (currently_typed.length > 0) {
            currently_typed = currently_typed.substring(0, currently_typed.length - 1);
            keypress.stop();
            keypress.play();
          }
          break;


        case 'space':
          currently_typed += " ";
          completeWord = ["", "", ""];
          keypress.stop();
          keypress.play();
          break;


        default:
          if(c == ''){
            break;
          }
          currently_typed += c;
          keypress.stop();
          keypress.play();
          break;
      }
      autocomplete();
    }
    // Check if mouse click happened within 'ACCEPT' 
    // (i.e., submits a phrase and completes a trial)
    else if (mouseClickWithin(width / 2 - 2 * PPCM, height / 2 - 5.1 * PPCM, 4.0 * PPCM, 2.0 * PPCM)) {
      // Saves metrics for the current trial
      letters_expected += target_phrase.trim().length;
      letters_entered += currently_typed.trim().length;
      errors += computeLevenshteinDistance(currently_typed.trim(), target_phrase.trim());
      entered[current_trial] = currently_typed;
      trial_end_time = millis();

      current_trial++;

      // Check if the user has one more trial/phrase to go
      if (current_trial < 2) {
        // Prepares for new trial
        currently_typed = "";
        target_phrase = phrases[current_trial];
      } else {
        // The user has completed both phrases for one attempt
        draw_finger_arm = false;
        attempt_end_time = millis();

        printAndSavePerformance();        // prints the user's results on-screen and sends these to the DB
        attempt++;

        // Check if the user is about to start their second attempt
        if (attempt < 2) {
          second_attempt_button = createButton('START 2ND ATTEMPT');
          second_attempt_button.mouseReleased(startSecondAttempt);
          second_attempt_button.position(width / 2 - second_attempt_button.size().width / 2, height / 2 + 220);
        }
      }
    }
  }
}

// Resets variables for second attempt
function startSecondAttempt() {
  // Re-randomize the trial order (DO NOT CHANG THESE!)
  shuffle(phrases, true);
  current_trial = 0;
  target_phrase = phrases[current_trial];

  // Resets performance variables (DO NOT CHANG THESE!)
  letters_expected = 0;
  letters_entered = 0;
  errors = 0;
  currently_typed = "";
  CPS = 0;

  current_letter = '';

  // Show the watch and keyboard again
  second_attempt_button.remove();
  draw_finger_arm = true;
  attempt_start_time = millis();
}

// Print and save results at the end of 2 trials
function printAndSavePerformance() {
  // DO NOT CHANGE THESE
  let attempt_duration = (attempt_end_time - attempt_start_time) / 60000;          // 60K is number of milliseconds in minute
  let wpm = (letters_entered / 5.0) / attempt_duration;
  let freebie_errors = letters_expected * 0.05;                                  // no penalty if errors are under 5% of chars
  let penalty = max(0, (errors - freebie_errors) / attempt_duration);
  let wpm_w_penalty = max((wpm - penalty), 0);                                   // minus because higher WPM is better: NET WPM
  let timestamp = day() + "/" + month() + "/" + year() + "  " + hour() + ":" + minute() + ":" + second();

  CPS = currently_typed.trim().length / (attempt_duration * 60);

  background(color(0, 0, 0));    // clears screen
  cursor();                    // shows the cursor again

  textFont("Arial", 16);       // sets the font to Arial size 16
  fill(color(255, 255, 255));    //set text fill color to white
  text(timestamp, 100, 20);    // display time on screen 

  text("Finished attempt " + (attempt + 1) + " out of 2!", width / 2, height / 2);

  // For each trial/phrase
  let h = 20;
  for (i = 0; i < 2; i++ , h += 40) {
    text("Target phrase " + (i + 1) + ": " + phrases[i], width / 2, height / 2 + h);
    text("User typed " + (i + 1) + ": " + entered[i], width / 2, height / 2 + h + 20);
  }

  text("CPS: " + CPS.toFixed(2), width / 2, height / 2 + h + 20);
  text("Raw WPM: " + wpm.toFixed(2), width / 2, height / 2 + h + 40);
  text("Freebie errors: " + freebie_errors.toFixed(2), width / 2, height / 2 + h + 60);
  text("Penalty: " + penalty.toFixed(2), width / 2, height / 2 + h + 80);
  text("WPM with penalty: " + wpm_w_penalty.toFixed(2), width / 2, height / 2 + h + 100);

  // Saves results (DO NOT CHANGE!)
  let attempt_data = {
    project_from: GROUP_NUMBER,
    assessed_by: student_ID,
    attempt_completed_by: timestamp,
    attempt: attempt,
    attempt_duration: attempt_duration,
    raw_wpm: wpm,
    freebie_errors: freebie_errors,
    penalty: penalty,
    wpm_w_penalty: wpm_w_penalty,
    cps: CPS
  }

  // Send data to DB (DO NOT CHANGE!)
  if (BAKE_OFF_DAY) {
    // Access the Firebase DB
    if (attempt === 0) {
      firebase.initializeApp(firebaseConfig);
      database = firebase.database();
    }

    // Add user performance results
    let db_ref = database.ref('G' + GROUP_NUMBER);
    db_ref.push(attempt_data);
  }
}

// Is invoked when the canvas is resized (e.g., when we go fullscreen)
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  let display = new Display({ diagonal: display_size }, window.screen);

  // DO NO CHANGE THESE!
  PPI = display.ppi;                        // calculates pixels per inch
  PPCM = PPI / 2.54;                         // calculates pixels per cm
  FINGER_SIZE = (int)(11 * PPCM);
  FINGER_OFFSET = (int)(0.8 * PPCM)
  ARM_LENGTH = (int)(19 * PPCM);
  ARM_HEIGHT = (int)(11.2 * PPCM);

  ARROW_SIZE = (int)(2.2 * PPCM);

  //Base Screen info
  xBaseScreen = width / 2 - 2.0 * PPCM;
  yBaseScreen = height / 2 - 1.0 * PPCM;
  wBaseScreen = 4.0 * PPCM;
  hBaseScreen = 3.0 * PPCM;

  wButton = wBaseScreen / 5;
  hButton = hBaseScreen / 4;

  tutorial = true;
}
