const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

const cucumberJsonDir = './cypress/test-results';
const cucumberReportFileMap = {};
const cucumberReportMap = {};
const jsonIndentLevel = 2;
const screenshotsDir = './cypress/screenshots';

getCucumberReportMaps();
addScreenshots();

function getCucumberReportMaps() {
  const files = fs.readdirSync(cucumberJsonDir).filter((file) => {
    return file.indexOf('.json') > -1;
  });
  files.forEach((file) => {
    const json = JSON.parse(fs.readFileSync(path.join(cucumberJsonDir, file)));
    if (!json[0]) {
      return;
    }
    const [feature] = json[0].uri.split('/').reverse();
    cucumberReportFileMap[feature] = file;
    cucumberReportMap[feature] = json;
  });
}

function addScreenshots() {
  const failingFeatures = fs.readdirSync(screenshotsDir);
  failingFeatures.forEach((feature) => {
    const screenshots = fs
      .readdirSync(path.join(screenshotsDir, feature))
      .filter((file) => {
        return file.indexOf('.png') > -1;
      });
    screenshots.forEach((screenshot) => {
      // regex to parse 'I can use scenario outlines with examples' from either of these:
      // Getting Started -- I can use scenario outlines with examples (example #1) (failed).png
      // Getting Started -- I can use scenario outlines with examples (failed).png
      const regex = /(?<=--\ ).+?((?=\ \(example\ #\d+\))|(?=\ \(failed\))|(?=\.\w{3}))/g;
      const [scenarioName] = screenshot.match(regex);
      console.info(
        chalk.blue('\n    Adding screenshot to cucumber-json report for')
      );
      console.info(chalk.blue(`    '${scenarioName}'`));
      //Find all scenarios matching the scenario name of the screenshot.
      //This is important when using the scenario outline mechanism
      const myScenarios = cucumberReportMap[feature][0].elements.filter((e) =>
        scenarioName.includes(e.name)
      );
      if (!myScenarios) {
        return;
      }
      myScenarios.forEach((myScenario) => {
        let myStep;
        if (screenshot.includes('failed')) {
          myStep = myScenario.steps.find(
            (step) => step.result.status === 'failed'
          );
        } else {
          myStep = myScenario.steps.find((step) =>
            step.name.includes('screenshot')
          );
        }
        if (!myStep) {
          return;
        }
        const data = fs.readFileSync(
          path.join(screenshotsDir, feature, screenshot)
        );
        if (data) {
          const base64Image = Buffer.from(data, 'binary').toString('base64');
          if (!myStep.embeddings) {
            myStep.embeddings = [];
          } else {
            //remove existing screenshot
            myStep.embeddings.pop();
          }
          myStep.embeddings.push({ data: base64Image, mime_type: 'image/png' });
        }
      });
      //Write JSON with screenshot back to report file.
      fs.writeFileSync(
        path.join(cucumberJsonDir, cucumberReportFileMap[feature]),
        JSON.stringify(cucumberReportMap[feature], null, jsonIndentLevel)
      );
    });
  });
}
