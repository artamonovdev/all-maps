require('es6-promise').polyfill();

var gulp = require('gulp'),
    plumber = require('gulp-plumber'),
    rename = require('gulp-rename'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    imagemin = require('gulp-imagemin'),
    cache = require('gulp-cache'),
    sass = require('gulp-sass'),
    cleanCSS = require('gulp-clean-css'),
    sourcemaps = require('gulp-sourcemaps'),
    postcss = require('gulp-postcss'),
    autoprefixer = require('autoprefixer'),
    server = require('gulp-develop-server');
var browserSync = require('browser-sync').create();

/*
* reload for somedomain.someextension
* */

gulp.task('browser-sync', function() {
    browserSync.init({
        // proxy: "http://local.tourist777.ru/",
        //tunnel: "my-private-site-329183912"
        //open: "ui",
        //notify: false
    });
});


/*
 * sass -> css
 * */
gulp.task('convert_scss_and_minification', function () {
    gulp.src(['src/scss/**/*'])
        .pipe(plumber({
            errorHandler: function (error) {
                console.log(error.message);
                this.emit('end');
            }
        }))
        .pipe(sass())
        .pipe(postcss([autoprefixer({browsers: ['last 2 versions']})]))
        .pipe(rename({suffix: '.min'}))
        .pipe(sourcemaps.init())
        .pipe(cleanCSS())
        .pipe(sourcemaps.write('map'))
        .pipe(gulp.dest('./dist/css/'))
        .pipe(browserSync.stream());
});

/*
 * minification of JS
 * */
gulp.task('minification_js', function () {
    return gulp.src('./src/js/**/*')
        .pipe(sourcemaps.init())
        .pipe(plumber({
            errorHandler: function (error) {
                console.log(error.message);
                this.emit('end');
            }
        }))
        //.pipe(concat('concat.js'))
        .pipe(rename({suffix: '.min'}))
        .pipe(uglify())
        .pipe(sourcemaps.write('map'))
        .pipe(gulp.dest('./dist/js/'));
});

gulp.task('minification_js_library', function () {
    return gulp.src(["lib/bower_components/jquery/dist/jquery.min.js", "lib/button_full_screen/full_screen_control.js", "lib/traffic_control/fraffic_control.js", "lib/leaflet/leaflet.js", "lib/node_modules/leaflet-draw/dist/leaflet.draw.js", "lib/bower_components/google-maps-ruler/dist/google-maps-ruler.js", "lib/ruler_control/ruler_control.js", "lib/geocoding_google_control/geocoding_google_control.js", "lib/route_google_control/route_google_control.js", "lib/leaflet_measurement_control/leaflet.measurecontrol.js", "lib/extension_leaflet/full_screen/Leaflet.fullscreen.min.js", "lib/bing_layer/Bing.js", "lib/leaflet-control-geocoder-1.5.1/dist/Control.Geocoder.js", "lib/leaflet-control-geocoder-1.5.1/my_drop_down_menu/drop_down_menu_providers.js", "lib/leaflet_route_lib_providers/lrm-mapbox-1.0.4.js", "lib/leaflet_route_lib_providers/lrm-graphhopper-1.1.2.min.js", "lib/leaflet_route_lib_providers/lrm-mapzen-master/dist/lrm-mapzen.min.js", "lib/node_modules/leaflet-routing-machine/dist/leaflet-routing-machine.min.js", "lib/node_modules/leaflet-routing-machine/my_control/control_routing_machine.js"])
        .pipe(plumber({
            errorHandler: function (error) {
                console.log(error.message);
                this.emit('end');
            }
        }))
        .pipe(concat('libraries.js'))
        .pipe(uglify())
        .pipe(gulp.dest('./dist/js/'));
});

gulp.task('minification_css_library', function () {
    gulp.src(["lib/bower_components/foundation-sites/dist/css/foundation-flex.min.css", "lib/leaflet/leaflet.css", "lib/node_modules/leaflet-draw/dist/leaflet.draw.css", "lib/leaflet_measurement_control/leaflet.measurecontrol.css", "lib/bower_components/google-maps-ruler/google-maps-ruler.css", "lib/leaflet_route_lib_providers/lrm-mapzen-master/dist/lrm-mapzen.css", "lib/leaflet-control-geocoder-1.5.1/dist/Control.Geocoder.css", "lib/extension_leaflet/full_screen/leaflet.fullscreen.css", "lib/node_modules/leaflet-routing-machine/dist/leaflet-routing-machine.css"])
        .pipe(plumber({
            errorHandler: function (error) {
                console.log(error.message);
                this.emit('end');
            }
        }))
        .pipe(concat('libraries.css'))
        .pipe(cleanCSS())
        .pipe(gulp.dest('./dist/css/'))
});

gulp.task('default', ['convert_scss_and_minification', 'browser-sync', 'minification_js_library', 'minification_css_library'], function () {
    gulp.watch("src/scss/**/*", ['convert_scss_and_minification']);
    //gulp.watch("src/js/**/*", ['minification_js', browserSync.reload]);
    //gulp.watch("../views/**/*").on('change', browserSync.reload);
    //gulp.watch("../assets/**/*").on('change', browserSync.reload);
    gulp.watch("./index.html").on('change', browserSync.reload);
    gulp.watch("./src/js/ui-logic.js").on('change', browserSync.reload);
});