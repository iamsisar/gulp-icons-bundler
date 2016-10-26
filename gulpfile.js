"use strict";

var yaml = require('js-yaml');
var fs = require('fs');
var async = require('async');

var gulp = require('gulp');
var svgmin = require('gulp-svgmin');
var xmlEdit = require('gulp-edit-xml');
var rename = require('gulp-rename');
var newer = require('gulp-newer');

var svg2png = require('gulp-svg2png');
var iconfont = require('gulp-iconfont');
var consolidate = require('gulp-consolidate');
var zip = require('gulp-zip');

var config = yaml.safeLoad(fs.readFileSync('config.yaml', 'utf8'));
var pkg = JSON.parse(fs.readFileSync('./package.json'));


var colorizeTasks = [];
var rasterizeTasks = [];

// strip out three digits incremental prefix from string
function fileNameFilter(basename){
   return basename.replace( /^(\d{3}_)/g, '' )
}

function colorizeSvg(src, color, name) {
    return gulp.src(src)
    .pipe(svgmin({
            plugins: [{
                collapseGroups: true
            }]
        }))
    .pipe(xmlEdit(function(xml) {
        var nodes = xml.svg.path || xml.svg.g;
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

for (let key in config.colors) {
    if (config.colors.hasOwnProperty(key)) {
        let taskName = 'colorizeSvg' + '_' + key;
        colorizeTasks.push(taskName);
        gulp.task(taskName, function() {
            return colorizeSvg('source/**/*.svg', config.colors[key], key)
            .pipe(rename(function(path) {
                path.basename = fileNameFilter(path.basename) + "-" + key;
            }))
            .pipe(gulp.dest('dist/svg'));
        });
    }
}

function rasterizeSvg(src, scale, name) {
        return gulp.src(src).pipe(svg2png(scale, true, 5))
        .pipe(rename(function(path) {
            path.basename = fileNameFilter(path.basename) + '--' + name;
        }))
        .pipe(gulp.dest('dist/png'));
    }

for (let key in config.sizes) {
    if (config.sizes.hasOwnProperty(key)) {
        let taskName = 'svg2png' + key;
        rasterizeTasks.push(taskName);
        gulp.task(taskName, function() {
            return rasterizeSvg('dist/svg/**/*.svg', {
                width: config.sizes[key]
            }, key);
        });
    }
}



function consolidateFontTemplate(src, dest, basename, glyphs){
    return gulp.src(src)
        .pipe(consolidate('lodash', {
            glyphs: glyphs,
            glyphNameFilter: function(glyph){
                return fileNameFilter(glyph.name)
            },
            fontName: config.font.name,
            version: pkg.version,
            fontPath: '../fonts/',
            className: config.font.classname
        }))
        .pipe(rename(function(path) {
            path.basename = basename;
        }))
        .pipe(gulp.dest(dest));
}


gulp.task('Iconfont', function(done) {
    var iconStream = gulp.src(['source/*.svg'])
        .pipe(iconfont({
            fontName: config.font.name
        }));

    async.parallel([
        function handleGlyphs(cb) {

            iconStream.on('glyphs', function(glyphs, options) {
                consolidateFontTemplate('templates/iconfont-stylesheet.css','dist/css/', config.font.name, glyphs);

                consolidateFontTemplate('templates/iconfont-demo.css','dist/demo/css/', 'demo', glyphs);

                consolidateFontTemplate('templates/iconfont-demo.html','dist/demo/', 'index', glyphs).on('finish', cb);;
            });


        },
        function handleFonts(cb) {
            iconStream.pipe(gulp.dest('dist/fonts/')).on('finish', cb);
        }
    ], done);
});


gulp.task('zip', () => {
    return gulp.src([
        './**',
        '!node_modules',
        '!node_modules/**',
        '!*.zip'
        ])
        .pipe(zip(config.font.name + '-' + pkg.version + '.zip'))
        .pipe(gulp.dest('.'));
});

gulp.task('build',
    gulp.series(
        gulp.parallel(
            colorizeTasks,
            'Iconfont'
        ),
        gulp.parallel(
            rasterizeTasks
        ),
        'zip'
    )
);