#!/usr/bin/env node

const argv = require('minimist')(process.argv.slice(2));
const chalk = require('chalk');
const filterBy = require('gulp-filter-by');
const fs = require('fs-extra');
const gulp = require('gulp');
const gulpFn = require('gulp-fn');
const gulpShell = require('gulp-shell');
const image = require('gulp-image');
const sha1 = require('sha1');
const shell = require('shelljs');
var gulpif = require('gulp-if');

const DEST_PATH = argv.dest;
const MANIFEST_PATH = argv.manifest;
const SRC_PATH = argv.src;
const GIT_ADD = argv.gitadd || true;

const buildHash = file => sha1(file._contents + file.relative);

console.log(chalk.yellow('Start image compression'));

gulp.task('compress-images', () => {
  let manifest = {};

  if (fs.existsSync(MANIFEST_PATH)) {
    manifest = fs.readJsonSync(MANIFEST_PATH);
    manifest = JSON.stringify(manifest);
  }

  return gulp.src(SRC_PATH)
    .pipe(filterBy((file) => {
      if (!Object.keys(manifest).length > 0 || !manifest.includes(buildHash(file))) return true;
      return false;
    }))
    .pipe(image({
      concurrent: 10,
      gifsicle: true,
      mozjpeg: true,
      optipng: false,
      pngquant: false,
      svgo: true,
      zopflipng: false,
    }))
    .pipe(gulp.dest(DEST_PATH))
    .pipe(gulpif(GIT_ADD, gulpShell(['git add <%= file.path %>'])));
});

gulp.task('update-manifest', ['compress-images'], () => {
  const jsonData = {};

  return gulp.src(SRC_PATH)
    .pipe(gulpFn((file) => { jsonData[file.relative] = buildHash(file); }))
    .on('end', () => {
      const jsonDataSorted = {};
      Object.keys(jsonData).sort((a, b) => a.localeCompare(b, undefined, {numeric: true,})).forEach(function(key) {
        jsonDataSorted[key] = jsonData[key];
      });
      fs.writeFileSync(MANIFEST_PATH, JSON.stringify(jsonDataSorted, null, 2));
      if (GIT_ADD == true) {
        shell.exec(`git add ${MANIFEST_PATH}`);
      }
      console.log(chalk.yellow('Finished image compression'));
    });
});

gulp.start(['compress-images', 'update-manifest']);
