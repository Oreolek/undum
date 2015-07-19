var gulp = require('gulp');
var concat = require('gulp-concat');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var size = require('gulp-size');
var jshint = require('gulp-jshint');
var header = require('gulp-header');
var footer = require('gulp-footer');

var source = ["./src/internal.js", "./src/author.js", "./src/system.js", "./src/private.js", "./src/setup.js"];
var destination = "./games/media/js/";

gulp.task('default', function() {
  gulp.src(source)
    .pipe(sourcemaps.init())
      .pipe(concat('undum.js'))
      .pipe(header('(function () {'))
      .pipe(footer('})();'))
      .pipe(jshint())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(destination));
});

gulp.task('production', function() {
  gulp.src(source)
    .pipe(concat('undum.min.js'))
    .pipe(header('(function () {'))
    .pipe(footer('})();'))
    .pipe(jshint())
    .pipe(uglify())
    .pipe(size())
    .pipe(gulp.dest(destination));
});
