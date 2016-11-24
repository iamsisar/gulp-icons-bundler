"use strict";
const yaml = require('js-yaml');
const fs = require('fs');
const async = require('async');
const gulp = require('gulp');
const svgmin = require('gulp-svgmin');
const xmlEdit = require('gulp-edit-xml');
const rename = require('gulp-rename');
const newer = require('gulp-newer');
const path = require('path');
const svg2png = require('gulp-svg2png');
const iconfont = require('gulp-iconfont');
const consolidate = require('gulp-consolidate');
const zip = require('gulp-zip');

const pkg = JSON.parse(fs.readFileSync('./package.json'));


// check if configuration file exists. If not, use the author's example
try {
    fs.statSync('config.yaml').isFile();
    console.log('Custom configuration file found. Using "./config.yaml"');
    var config = yaml.safeLoad(fs.readFileSync('config.yaml', 'utf8'));
} catch (e) {
    if (e.code === 'ENOENT') {
        console.log('No configuration file found. Using "./config.example.yaml"');
        var config = yaml.safeLoad(fs.readFileSync('config.example.yaml', 'utf8'));
    } else {
        throw e;
    }
}


/**
 * Strips out a three digits incremental prefix from a string.
 * @param  {string} basename
 * @return {string}
 */
const fileNameFilter = (basename) => basename.replace(/^(\d{3}_)/g, '');

/**
 * Makes a coloured copy of .svg files replacing all the 'fill'
 * values across the document nodes.
 * @param  {string} src   Path of the original .svg
 * @param  {string} color HEX value of the new colour
 * @return {object}       Vinyl object representing the new file
 */
const colorizeSvg = (src, color) => {
    return gulp.src(src).pipe(svgmin({
        plugins: [{
            collapseGroups: true
        }]
    })).pipe(xmlEdit((xml) => {
        let nodes = xml.svg.path || xml.svg.g;
        for (let i = 0, l = nodes.length; i < l; i++) {
            let cn = nodes[i].$;
            if (cn.hasOwnProperty('fill')) {
                cn.fill = color;
            }
            nodes[i].$ = cn;
        }
        xml.svg.path = nodes;
        return xml;
    }));
}

// Create a list of tasks based on colorizeSvg() according to configuration file
var colorizeTasksList = [];

for (const key in config.colors) {
    if (config.colors.hasOwnProperty(key)) {
        // name the task for this palette
        const taskName = 'colorizeSvg' + '_' + key;
        // define the task
        gulp.task(taskName, () => {
            return colorizeSvg('assets/**/*.svg', config.colors[key], key).pipe(rename((path) => {
                path.basename = fileNameFilter(path.basename) + "-" + key;
            }))
            .pipe(gulp.dest('dist/svg'));
        });
        // add the task to the list
        colorizeTasksList.push(taskName);
    }
}



/**
 * Converts .svg to .png, checking if the source is newer.
 * @param  {string} src   Path of the .svg
 * @param  {object} scale Resize values
 * @param  {string} name  The suffix that will be added to the output filename
 * @return {object}       Vinyl object representing the new file
 */
const rasterizeSvg = (src, scale, name) => {
    return gulp.src(src).pipe(newer({
        dest: 'dist/png',
        map: (srcPath) => fileNameFilter(path.basename(srcPath, path.extname(srcPath))) + '--' + name + '.png'
    }))
    .pipe(svg2png(scale))
    .pipe(rename((destPath) => {
        destPath.basename = fileNameFilter(destPath.basename) + '--' + name;
    }))
    .pipe(gulp.dest('dist/png'));
}


// Create a list of tasks based on rasterizeSvg() according to configuration file
var rasterizeTasksList = [];

for (const key in config.sizes) {
    if (config.sizes.hasOwnProperty(key)) {
        const rasterizeTaskName = 'svg2png' + key;
        const rasterizeTaskOptions = {
            width: config.sizes[key]
        }
        rasterizeTasksList.push(rasterizeTaskName);
        gulp.task(rasterizeTaskName, () => rasterizeSvg('dist/svg/**/*.svg', rasterizeTaskOptions, key));
    }
}


/**
 * Creates a new file from a template, passing necessary variables.
 * @param  {string} src      Path of the template
 * @param  {string} dest     Path of the destination directory
 * @param  {string} basename Output filename
 * @param  {array} glyphs    A list of objects representing all the glyphs
 *                           created by gulp-iconfont.
 * @return {object}          Vinyl object representing the file
 */
const consolidateTemplate = (src, dest, basename, glyphs) => {
    return gulp.src(src).pipe(consolidate('lodash', {
        glyphs: glyphs,
        glyphNameFilter: (glyph) => fileNameFilter(glyph.name),
        fontName: config.font.name,
        className: config.font.classname,
        version: pkg.version,
        fontPath: '../fonts/'
    })).pipe(rename((path) => {
        path.basename = basename;
    })).pipe(gulp.dest(dest));
}


// Task definition. Create font files and demo assets
gulp.task('makeIconFont', (done) => {

    const iconStream = gulp.src(['assets/*.svg']).pipe(iconfont({
        fontName: config.font.name
    }));

    async.parallel([
        (cb) => {
            iconStream.on('glyphs', (glyphs, options) => {
                consolidateTemplate('templates/iconfont-stylesheet.css', 'dist/css/', config.font.name, glyphs);
                consolidateTemplate('templates/iconfont-demo.css', 'dist/demo/css/', 'demo', glyphs);
                consolidateTemplate('templates/iconfont-demo.html', 'dist/demo/', 'index', glyphs).on('finish', cb);;
            });
        },
        (cb) => {
            iconStream.pipe(gulp.dest('dist/fonts/')).on('finish', cb);
        }
    ], done);
});

// Task definition. Make a .zip archive which version number
// reflect the version of the package.
gulp.task('zip', () => {

    const archiveFileName = config.font.name + '-' + pkg.version + '.zip';

    return gulp.src(['./**', '!node_modules', '!node_modules/**', '!*.zip'])
    .pipe(zip(archiveFileName))
    .pipe(gulp.dest('./dist'));
});

gulp.task('build', gulp.series(
    gulp.parallel(
        colorizeTasksList,
        'makeIconFont'
    ),
    gulp.parallel(rasterizeTasksList),
    'zip'
    )
);