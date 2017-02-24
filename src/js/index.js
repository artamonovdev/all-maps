/**
 * Обращаться по поводу разработки: artamonovdev@gmail.com
 */

$(document).ready(function () {
    $('#container-own-controls').bind('blur change dblclick error focus focusin focusout keydown keypress keyup load mousedown mouseenter mouseleave mousemove mouseout mouseover mouseup resize scroll select submit', function (event) {
        event.stopPropagation();
    });
    // polyfill
    (function () {
        //    check integer
        Number.isInteger = Number.isInteger || function (value) {
                return typeof value === "number" && isFinite(value) && Math.floor(value) === value;
            };

        //    check numeric
        Number.isNumeric = function (n) {
            return !isNaN(parseFloat(n)) && isFinite(n);
        }
    })();


    $(document).on('resize_maps', function () {
        objChangeMapsBounds.forceResizeAllMaps();
    });


    // keys; zoom, lat, lng
    currentMapsData = {
        map: 'google'
    };
//    init google maps
    googleMaps;
    yandexMaps;
    leafletMaps;

    var $buttonFullscreenGoogleMaps;

    var $containerOwnControls = $('#containerOwnControls');
    var $containerAllMaps = $('#containerMaps');
    var $containerGoogleMaps = $('#googleMaps');
    var $containerYandexMaps = $('#yandexMaps');
    var $containerLeafletMaps = $('#leafletMaps');

    var isGoogleMapsFullScreen = false;
    var isYandexMapsFullScreen = false;
    var isLeafletMapsFullScreen = false;

    var ignoreBoundsChangeGoogle = false;
    var ignoreBoundsChangeYandex = false;
    var ignoreBoundsChangeLeaflet = false;

    var isNotMakePanLeaflet = false;

    // object for hash url
    // todo add logic for hash url
    var objFormationHashUrl = (function () {

        var objInterface = {
            createHashUrlViaLngLat: function (lat, lng) {
                var hashUrl = '#map=' + currentMapsData.map + '&mapTypeId=' + currentMapsData.mapTypeId + '&zoom=' + currentMapsData.zoom + '&lat=' + currentMapsData.latLng.lat + '&lng=' + currentMapsData.latLng.lng + '!';
                return hashUrl;
            },

            updateUrlWithCurrentState: function () {
                console.log(currentMapsData);
                var hashUrl = objInterface.createHashUrlViaLngLat(currentMapsData.latLng.lat, currentMapsData.latLng.lng);
                location.replace(hashUrl)
            },

            getDataFromUrl: function () {
                var hashUrl = window.location.hash;
                var map = /map=(.*?)&/.exec(hashUrl);
                map = (map !== null && map.length > 0) ? map[1] : undefined;

                var mapTypeId = /mapTypeId=(.*?)&/.exec(hashUrl);
                mapTypeId = (mapTypeId !== null && mapTypeId.length > 0) ? mapTypeId[1] : undefined;

                var zoom = /zoom=(.*?)&/.exec(hashUrl);
                zoom = (zoom !== null && zoom.length > 0) ? parseInt(zoom[1]) : undefined;

                var lat = /lat=(.*?)&/.exec(hashUrl);
                lat = (lat !== null && lat.length > 0) ? parseFloat(lat[1]) : undefined;

                var lng = /lng=(.*?)!/.exec(hashUrl);
                lng = (lng !== null && lng.length > 0) ? parseFloat(lng[1]) : undefined;

                return {
                    map: map,
                    mapTypeId: mapTypeId,
                    zoom: zoom,
                    lat: lat,
                    lng: lng
                };
            }
        };

        return objInterface;
    })();

    // object for change bounds on maps
    var objChangeMapsBounds = (function () {

        var timeForTimeoutOfError = 1000;

        var ignoreZoom = false;

        // function for simple change bounds of maps
        var changeBoundsYandexMaps = function (latLngArray, valueZoom) {
            try {
                yandexMaps.setCenter(latLngArray, valueZoom);
            } catch (e) {
                console.log('Yandex maps have not yet loaded: ' + e);
                window.setTimeout(changeBoundsYandexMaps.bind(this, latLngArray, valueZoom), timeForTimeoutOfError);
            }
        };

        var changeBoundsGoogleMaps = function (latLng, valueZoom) {
            try {
                googleMaps.setZoom(valueZoom);
                googleMaps.setCenter(latLng);
            } catch (e) {
                console.log('Google maps error: ' + e);
                window.setTimeout(changeBoundsGoogleMaps.bind(this, latLng, valueZoom), timeForTimeoutOfError);
            }
        };

        var changeBoundsLeafletMaps = function (latLng, valueZoom) {
            try {
                //leafletMaps.setView([latLng.lat, latLng.lng], valueZoom);
                // or leafletMaps.setView([latLng.lat, latLng.lng], valueZoom, true); !!! LAST parameter = true
                // or add leafletMaps._rawPanBy(L.point([0,0]))
                //if (!isNotMakePanLeaflet) {
                //    leafletMaps._rawPanBy(L.point([0, 0]));
                //    isNotMakePanLeaflet = true;
                //}
                if (ignoreBoundsChangeLeaflet) {
                    leafletMaps.setView([latLng.lat, latLng.lng], valueZoom, true);
                } else {
                    leafletMaps.setView([latLng.lat, latLng.lng], valueZoom);
                }

                console.log('SETVIEW LEAFLET');
            } catch (e) {
                console.log('Leaflet maps error: ' + e);
                window.setTimeout(changeBoundsLeafletMaps.bind(this, latLng, valueZoom), timeForTimeoutOfError);
            }
        };

        // service for get max zoom by latLng for google maps
        var maxZoomServiceGoogle = new google.maps.MaxZoomService();

        // variable for run of change position
        var runChangePositionOfGoogleMaps = function (latLng, valueZoomOfCurrentMap, isCallFromTimeout) {
            if (currentMapsData.map === 'google' && isCallFromTimeout) {
                return;
            }
            try {
                ignoreZoom = ignoreBoundsChangeGoogle;
                var zoomLevelForGoogleMaps = objChangeMapsBounds.preliminaryZoomLevel(valueZoomOfCurrentMap);
                changeBoundsGoogleMaps(latLng, zoomLevelForGoogleMaps);
                if (ignoreZoom) {
                    return;
                }
                maxZoomServiceGoogle.getMaxZoomAtLatLng(latLng, function (response) {
                    //console.log('Max zoom for google maps');
                    //console.log(response);
                    var minZoomLevelGoogle = 0;
                    var maxZoomLevelGoogle;

                    if (response.status === google.maps.MaxZoomStatus.OK) {
                        maxZoomLevelGoogle = response.zoom;
                    } else {
                        // if response has error
                        maxZoomLevelGoogle = 18;
                    }
                    var rangeMinMaxZoomLevelGoogle = [minZoomLevelGoogle, maxZoomLevelGoogle];
                    var zoomForGoogleMaps = objChangeMapsBounds.valueFromRangeOrNearestEdge(rangeMinMaxZoomLevelGoogle, valueZoomOfCurrentMap);
                    // change bounds
                    changeBoundsGoogleMaps(latLng, zoomForGoogleMaps);
                });
            } catch (e) {
                console.log('Google maps error: ' + e);
                window.setTimeout(runChangePositionOfGoogleMaps.bind(this, latLng, valueZoomOfCurrentMap), timeForTimeoutOfError);
            }
        };

        var runChangePositionOfYandexMaps = function (latLng, valueZoomOfCurrentMap, isCallFromTimeout) {
            if (currentMapsData.map === 'yandex' && isCallFromTimeout) {
                return;
            }
            try {
                ignoreZoom = ignoreBoundsChangeYandex;
                var zoomLevelForYandexMaps = objChangeMapsBounds.preliminaryZoomLevel(valueZoomOfCurrentMap);
                var latLngArray = [latLng.lat, latLng.lng];
                changeBoundsYandexMaps(latLngArray, zoomLevelForYandexMaps);
                if (ignoreZoom) {
                    return;
                }
                yandexMaps.zoomRange.get(latLngArray).then(function (range) {
                    //console.log('Max and min zoom range for yandex map');
                    //console.log(range);
                    //    check zoom level of google map with max and min level of yandex map
                    //    range[0] - min level
                    //    range[1] - max level

                    var zoomForYandexMaps = objChangeMapsBounds.valueFromRangeOrNearestEdge(range, valueZoomOfCurrentMap);
                    // change bounds
                    changeBoundsYandexMaps(latLngArray, zoomForYandexMaps);
                });
            } catch (e) {
                //console.log('Yandex maps have not yet loaded: ' + e);
                window.setTimeout(runChangePositionOfYandexMaps.bind(this, latLng, valueZoomOfCurrentMap), timeForTimeoutOfError);
            }
        };

        var runChangePositionOfLeafletMaps = function (latLng, valueZoomOfCurrentMap, isCallFromTimeout) {
            if (currentMapsData.map === 'leaflet' && isCallFromTimeout) {
                return;
            }
            try {
                var rangeMinMaxZoomLevelLeaflet = [leafletMaps.getMinZoom(), leafletMaps.getMaxZoom()];
                var zoomForLeafletMaps = objChangeMapsBounds.valueFromRangeOrNearestEdge(rangeMinMaxZoomLevelLeaflet, valueZoomOfCurrentMap);

                //console.log('Google zoom = ' + valueZoomOfCurrentMap);
                //console.log('Leaflet zoom = ' + zoomForLeafletMaps);

                changeBoundsLeafletMaps(latLng, zoomForLeafletMaps);
            } catch (e) {
                console.log('Leaflet maps error: ' + e);
                window.setTimeout(runChangePositionOfLeafletMaps.bind(this, latLng, valueZoomOfCurrentMap), timeForTimeoutOfError);
            }
        };

        // variable for handle of timeout
        var timeoutOfGoogleMaps, timeoutOfYandexMaps, timeoutOfLeafletMaps;

        // time for timeout
        var timeForTimeoutChangeAnotherMaps = 3000;

        var interfaceObj = {

            valueFromRangeOrNearestEdge: function (range, valueOfCurrentMap) {
                var minLevelZoomNewMaps = range[0];
                var maxLevelZoomNewMaps = range[1];

                var valueOfZoomForNewMap = valueOfCurrentMap;

                if (valueOfCurrentMap < minLevelZoomNewMaps) {
                    console.log('Zooms not equal');
                    valueOfZoomForNewMap = minLevelZoomNewMaps;
                } else if (valueOfCurrentMap > maxLevelZoomNewMaps) {
                    console.log('Zooms not equal');
                    valueOfZoomForNewMap = maxLevelZoomNewMaps;
                }

                return valueOfZoomForNewMap;
            },

            preliminaryZoomLevel: function (valueZoomOfCurrentMap) {
                //console.log('Preliminary zoom level!');
                var preliminaryZoomLevel;
                preliminaryZoomLevel = valueZoomOfCurrentMap > 18 ? 18 : valueZoomOfCurrentMap;
                preliminaryZoomLevel = valueZoomOfCurrentMap < 0 ? 0 : preliminaryZoomLevel;

                return preliminaryZoomLevel;
            },

            changePositionOfGoogleMaps: function (latLng, valueZoomOfCurrentMap) {
                //    remove previous timer
                window.clearTimeout(timeoutOfGoogleMaps);
                //    add new timer
                timeoutOfGoogleMaps = window.setTimeout(runChangePositionOfGoogleMaps.bind(interfaceObj, latLng, valueZoomOfCurrentMap, true), timeForTimeoutChangeAnotherMaps + 50);
            },

            changePositionOfYandexMaps: function (latLng, valueZoomOfCurrentMap) {
                //    remove previous timer
                window.clearTimeout(timeoutOfYandexMaps);
                //    add new timer
                timeoutOfYandexMaps = window.setTimeout(runChangePositionOfYandexMaps.bind(interfaceObj, latLng, valueZoomOfCurrentMap, true), timeForTimeoutChangeAnotherMaps + 100);
            },

            changePositionOfLeafletMaps: function (latLng, valueZoomOfCurrentMap) {
                //    remove previous timer
                window.clearTimeout(timeoutOfLeafletMaps);
                //    add new timer
                timeoutOfLeafletMaps = window.setTimeout(runChangePositionOfLeafletMaps.bind(interfaceObj, latLng, valueZoomOfCurrentMap, true), timeForTimeoutChangeAnotherMaps + 150);
            },

            onceChangePositionOfGoogleMaps: function () {
                console.log('onceChangePositionOfGoogleMaps');
                runChangePositionOfGoogleMaps(currentMapsData.latLng, currentMapsData.zoom, false);
            },

            onceChangePositionOfYandexMaps: function () {
                console.log('onceChangePositionOfYandexMaps');
                runChangePositionOfYandexMaps(currentMapsData.latLng, currentMapsData.zoom, false);
            },

            onceChangePositionOfLeafletMaps: function () {
                console.log('onceChangePositionOfLeafletMaps');
                runChangePositionOfLeafletMaps(currentMapsData.latLng, currentMapsData.zoom, false);
            },

            onceChangePositionOfCurrentMap: function (latLng, zoom) {
                currentMapsData.latLng.lat = latLng.lat;
                currentMapsData.latLng.lng = latLng.lng;
                currentMapsData.zoom = zoom;
                switch (currentMapsData.map) {
                    case 'google':
                        ignoreBoundsChangeGoogle = true;
                        objChangeMapsBounds.onceChangePositionOfGoogleMaps();
                        console.log('ACTIVE MAP: ' + currentMapsData.map);
                        break;
                    case 'yandex':
                        ignoreBoundsChangeYandex = true;
                        objChangeMapsBounds.onceChangePositionOfYandexMaps();
                        console.log('ACTIVE MAP: ' + currentMapsData.map);
                        break;
                    case 'leaflet':
                        isNotMakePanLeaflet = ignoreBoundsChangeLeaflet = true;
                        objChangeMapsBounds.onceChangePositionOfLeafletMaps();
                        console.log('ACTIVE MAP: ' + currentMapsData.map);
                        break;
                    default:
                        console.log('ACTIVE MAP WARNING: ' + currentMapsData.map);
                        ignoreBoundsChangeGoogle = true;
                        ignoreBoundsChangeYandex = true;
                        isNotMakePanLeaflet = ignoreBoundsChangeLeaflet = true;
                        objChangeMapsBounds.onceChangePositionsAllMaps();
                        break;
                }
            },

            onceChangePositionsAllMaps: function () {
                interfaceObj.onceChangePositionOfGoogleMaps();
                interfaceObj.onceChangePositionOfLeafletMaps();
                interfaceObj.onceChangePositionOfYandexMaps();
            },

            forceResizeAllMaps: function () {
                //    google
                google.maps.event.trigger(googleMaps, 'resize');
                //    yandex
                yandexMaps.container.fitToViewport();
                //    leaflet
                leafletMaps.invalidateSize();
            }
        };

        return interfaceObj;
    })();

    // object for change listeners
    var objChangeMapsListeners = (function () {

        var listenerHandleBoundsChangesGoogle;
        var listenerHandleBoundsChangesYandex;
        var listenerHandleBoundsChangesLeaflet;

        var interfaceObj = {
            //    add listener on maps -> changed center, changed zoom

            addListenersChangedPositionGoogle: function () {
                console.log('addListenersChangedPositionGoogle');
                // if much count click on one button - always only one handler
                google.maps.event.clearListeners(googleMaps, 'idle');

                //    add listener on full load of google maps after change center
                listenerHandleBoundsChangesGoogle = google.maps.event.addListener(googleMaps, 'idle', function () {
                    if (ignoreBoundsChangeGoogle) {
                        ignoreBoundsChangeGoogle = false;
                        return;
                    }
                    //    google maps is complete
                    console.log('Idle evet on google maps fire!');
                    //    change center position in another maps: yandex, leaflet
                    //    get center maps from google maps
                    var centerOfGoogleMaps = googleMaps.getCenter();
                    var latLng = {
                        lat: centerOfGoogleMaps.lat(),
                        lng: centerOfGoogleMaps.lng()
                    };
                    var zoomOfGoogleMaps = googleMaps.getZoom();

                    //    set center for yandex map
                    objChangeMapsBounds.changePositionOfYandexMaps(latLng, zoomOfGoogleMaps);

                    //    set center for leaflet map
                    objChangeMapsBounds.changePositionOfLeafletMaps(latLng, zoomOfGoogleMaps);

                    objUtilHistory.saveCurrentDataMap(undefined, latLng, zoomOfGoogleMaps);
                });
            },

            removeListenersChangedPositionGoogle: function () {
                console.log('removeListenersChangedPositionGoogle');
                google.maps.event.clearListeners(googleMaps, 'idle');
            },

            addListenersChangedPositionYandex: function () {

                console.log('addListenersChangedPositionYandex');

                // if much count click on one button - always only one handler
                yandexMaps.events.remove('boundschange', listenerHandleBoundsChangesYandex);

                listenerHandleBoundsChangesYandex = function (event) {
                    if (ignoreBoundsChangeYandex) {
                        ignoreBoundsChangeYandex = false;
                        return;
                    }
                    console.log('-------------------Yandex event - boundchange!------------------------------');

                    // get center position of yandex maps and zoom level
                    // array [lat, lng]
                    var centerOfYandexMaps = event.get('newCenter');
                    var latLng = {
                        lat: centerOfYandexMaps[0],
                        lng: centerOfYandexMaps[1]
                    };
                    var zoomLevelOfYandexMaps = event.get('newZoom');

                    // set new position for google maps
                    objChangeMapsBounds.changePositionOfGoogleMaps(latLng, zoomLevelOfYandexMaps);

                    // set new position for yandex maps
                    objChangeMapsBounds.changePositionOfLeafletMaps(latLng, zoomLevelOfYandexMaps);

                    objUtilHistory.saveCurrentDataMap(undefined, latLng, zoomLevelOfYandexMaps);
                };

                yandexMaps.events.add('boundschange', listenerHandleBoundsChangesYandex);
            },

            removeListenersChangedPositionYandex: function () {
                console.log('removeListenersChangedPositionYandex');
                try {
                    yandexMaps.events.remove('boundschange', listenerHandleBoundsChangesYandex);
                } catch (e) {
                    console.log('Error removeListenersChangedPositionYandex' + e);
                }
            },

            addListenersChangedPositionLeaflet: function () {
                console.log('addListenersChangedPositionLeaflet');

                // if much count click on one button - always only one handler

                leafletMaps.off('moveend', listenerHandleBoundsChangesLeaflet);

                listenerHandleBoundsChangesLeaflet = function () {
                    if (ignoreBoundsChangeLeaflet) {
                        ignoreBoundsChangeLeaflet = false;
                        return;
                    }
                    //    get center coordinate and zoom level
                    //    obj -> keys: lat, lng
                    var centerOfLeafletMaps = leafletMaps.getCenter();
                    //    get zoom level
                    var zoomLevelOfLeafletMaps = leafletMaps.getZoom();

                    // set new position for google maps
                    objChangeMapsBounds.changePositionOfGoogleMaps(centerOfLeafletMaps, zoomLevelOfLeafletMaps);

                    // set new position for yandex maps
                    objChangeMapsBounds.changePositionOfYandexMaps(centerOfLeafletMaps, zoomLevelOfLeafletMaps);

                    objUtilHistory.saveCurrentDataMap(undefined, centerOfLeafletMaps, zoomLevelOfLeafletMaps);
                };

                leafletMaps.on('moveend', listenerHandleBoundsChangesLeaflet);

            },

            removeListenersChangedPositionLeaflet: function () {
                console.log('removeListenersChangedPositionLeaflet');
                leafletMaps.off('moveend', listenerHandleBoundsChangesLeaflet);
            }
        };

        return interfaceObj;
    })();

    var objUtilHistory = (function () {

        function storageAvailable(type) {
            try {
                var storage = window[type],
                    x = '__storage_test__';
                storage.setItem(x, x);
                storage.removeItem(x);
                return true;
            }
            catch (e) {
                return false;
            }
        }

        var possibleMapTypeIdGoogle = ['roadmap', 'hybrid', 'terrain', 'satellite'];
        var possibleMapTypeIdYandex = ['yandex#map', 'yandex#satellite', 'yandex#hybrid'];


        var isLocalStorageAvailable = storageAvailable('localStorage');

        var handleTimeout = null;

        var nameOfMaps = ['google', 'yandex', 'leaflet'];

        var numberCurrentActionSessionHistory;
        var arraySessionHistory = [];

        var firstStart = true;

        var btnUndo = $('#container-history-controls-container-btn_undo');
        var btnRedo = $('#container-history-controls-container-btn_redo');
        var btnCssClassDisabled = 'disable-btn-history';

        var addActionToSessionHistory = function (mapsData) {
            if (firstStart) {
                firstStart = false;
                return;
            }

            // compare current pointer session with head of array
            if ((arraySessionHistory.length !== 0) && (numberCurrentActionSessionHistory !== (arraySessionHistory.length - 1))) {
                //    delete history with index = (current index + 1) to END
                arraySessionHistory.splice(numberCurrentActionSessionHistory + 1);
            }
            //    add action to array
            arraySessionHistory.push(mapsData);
            //    increment number action in array or initialization
            if (numberCurrentActionSessionHistory === undefined || !Number.isNumeric(numberCurrentActionSessionHistory)) {
                numberCurrentActionSessionHistory = 0;
            } else {
                numberCurrentActionSessionHistory += 1;
            }

            // enable buttons
            if (numberCurrentActionSessionHistory === 1) {
                //    enable undo button
                btnUndo.removeClass(btnCssClassDisabled);
            }
            if (numberCurrentActionSessionHistory === (arraySessionHistory.length - 2)) {
                // enable redo button
                btnRedo.removeClass(btnCssClassDisabled);
            }

            // disable buttons
            if (numberCurrentActionSessionHistory === 0) {
                //    disable undo button
                btnUndo.addClass(btnCssClassDisabled);
            }

            if (numberCurrentActionSessionHistory === (arraySessionHistory.length - 1)) {
                //    disable redo button
                btnRedo.addClass(btnCssClassDisabled);
            }

            //    save to sessionHistory
            window.sessionStorage.setItem('numberCurrentActionSessionHistory', numberCurrentActionSessionHistory);
            var serializedHistoryArray = JSON.stringify(arraySessionHistory);
            window.sessionStorage.setItem('arraySessionHistory', serializedHistoryArray);

        };

        var clickUndo = function () {
            console.log('Click undo');
            if (numberCurrentActionSessionHistory > 0) {
                numberCurrentActionSessionHistory -= 1;
                //    get new map's state
                var newMapsPosition = arraySessionHistory[numberCurrentActionSessionHistory];
                var latLng = {
                    lat: newMapsPosition.lat,
                    lng: newMapsPosition.lng
                };
                var zoom = newMapsPosition.zoom;
                objInterface.saveCurrentDataMap(undefined, latLng, zoom, true);
                objChangeMapsBounds.onceChangePositionOfCurrentMap(latLng, zoom);
                //    save to sessionHistory
                window.sessionStorage.setItem('numberCurrentActionSessionHistory', numberCurrentActionSessionHistory);
                if (numberCurrentActionSessionHistory === 0) {
                    //    disable undo button
                    btnUndo.addClass(btnCssClassDisabled);
                }
                if (numberCurrentActionSessionHistory === (arraySessionHistory.length - 2)) {
                    // enable redo button
                    btnRedo.removeClass(btnCssClassDisabled);
                }
            }
        };

        var clickRedo = function () {
            console.log('Click redo');
            if (numberCurrentActionSessionHistory < (arraySessionHistory.length - 1)) {
                numberCurrentActionSessionHistory += 1;
                //    get new map's state
                var newMapsPosition = arraySessionHistory[numberCurrentActionSessionHistory];
                var latLng = {
                    lat: newMapsPosition.lat,
                    lng: newMapsPosition.lng
                };
                var zoom = newMapsPosition.zoom;
                objInterface.saveCurrentDataMap(undefined, latLng, zoom, true);
                objChangeMapsBounds.onceChangePositionOfCurrentMap(latLng, zoom);
                //    save to sessionHistory
                window.sessionStorage.setItem('numberCurrentActionSessionHistory', numberCurrentActionSessionHistory);
                if (numberCurrentActionSessionHistory === (arraySessionHistory.length - 1)) {
                    //    disable redo button
                    btnRedo.addClass(btnCssClassDisabled);
                }
                if (numberCurrentActionSessionHistory === 1) {
                    //    enable undo button
                    btnUndo.removeClass(btnCssClassDisabled);
                }
            }
        };

        var getDataFromUrlWithCheck = function () {
            var badDataFromUrl = false;

            // get map's data from url
            var mapsDataFromUrl = objFormationHashUrl.getDataFromUrl();

            if (!Number.isInteger(mapsDataFromUrl.zoom)) {
                badDataFromUrl = true;
            } else if (!Number.isNumeric(mapsDataFromUrl.lat)) {
                badDataFromUrl = true;
            } else if (!Number.isNumeric(mapsDataFromUrl.lng)) {
                badDataFromUrl = true;
            } else if (nameOfMaps.indexOf(mapsDataFromUrl.map) === -1) {
                badDataFromUrl = true;
            } else {
                if (mapsDataFromUrl.map === 'google' && (possibleMapTypeIdGoogle.indexOf(mapsDataFromUrl.mapTypeId) === -1)) {
                    badDataFromUrl = true;
                } else if (mapsDataFromUrl.map === 'yandex' && (possibleMapTypeIdYandex.indexOf(mapsDataFromUrl.mapTypeId) === -1)) {
                    badDataFromUrl = true;
                }
            }

            // remove url with bad params
            if (badDataFromUrl) {
                window.location.replace('#');
                //window.alert('Bad URL');
                console.log('URL is bad!!!');
            }

            mapsDataFromUrl.badDataFromUrl = badDataFromUrl;

            return mapsDataFromUrl;
        };

        var objInterface = {

            // for listen change of position maps in other tabs
            initListenInOtherTabs: function () {
                window.addEventListener('storage', function (event) {
                    // function for enable listeners for active map
                    //var enableListenersForActiveMap;
                    // function for change position of active map
                    var onceChangePositionOfActiveMap;
                    // disable listeners on active map
                    switch (currentMapsData.map) {
                        case 'google':
                            //objChangeMapsListeners.removeListenersChangedPositionGoogle();
                            ignoreBoundsChangeGoogle = true;
                            onceChangePositionOfActiveMap = objChangeMapsBounds.onceChangePositionOfGoogleMaps;
                            //enableListenersForActiveMap = objChangeMapsListeners.addListenersChangedPositionGoogle;
                            console.log('ACTIVE MAP: ' + currentMapsData.map);
                            break;
                        case 'yandex':
                            ignoreBoundsChangeYandex = true;
                            //objChangeMapsListeners.removeListenersChangedPositionYandex();
                            onceChangePositionOfActiveMap = objChangeMapsBounds.onceChangePositionOfYandexMaps;
                            //enableListenersForActiveMap = objChangeMapsListeners.addListenersChangedPositionYandex;
                            console.log('ACTIVE MAP: ' + currentMapsData.map);
                            break;
                        case 'leaflet':
                            isNotMakePanLeaflet = ignoreBoundsChangeLeaflet = true;
                            //objChangeMapsListeners.removeListenersChangedPositionLeaflet();
                            onceChangePositionOfActiveMap = objChangeMapsBounds.onceChangePositionOfLeafletMaps;
                            //enableListenersForActiveMap = objChangeMapsListeners.addListenersChangedPositionLeaflet;
                            console.log('ACTIVE MAP: ' + currentMapsData.map);
                            break;
                    }

                    //console.log('storage event:');

                    console.log(event);
                    // get data from storage
                    var storage = event.storageArea;
                    // add data latLng anf zoom to obj with current data for properly work of method onceChangePositionsAllMaps()
                    currentMapsData.latLng.lat = parseFloat(storage.getItem('mapsData_Lat'));
                    currentMapsData.latLng.lng = parseFloat(storage.getItem('mapsData_Lng'));
                    currentMapsData.zoom = parseInt(storage.getItem('mapsData_zoom'));

                    //    change position of map
                    if (handleTimeout) {
                        window.clearTimeout(handleTimeout);
                    }
                    handleTimeout = window.setTimeout(function () {
                        onceChangePositionOfActiveMap();
                        //    update url
                        objFormationHashUrl.updateUrlWithCurrentState();
                    }, 300);
                });
            },

            // save to localstorage
            saveCurrentDataMap: function (nameActiveMap, latLng, valueZoom, isClickUndoOrRedo, mapTypeId) {
                if (nameActiveMap !== undefined) {
                    currentMapsData.map = nameActiveMap;
                    window.localStorage.setItem('mapsData_map', nameActiveMap);
                    //    update name of layer
                    //    for last if statement
                    mapTypeId = objUtilHistory.getActiveMapTypeIdForMap(nameActiveMap);
                }
                if (latLng !== undefined) {
                    currentMapsData.latLng.lat = latLng.lat;
                    currentMapsData.latLng.lng = latLng.lng;
                    if (isLocalStorageAvailable) {
                        window.localStorage.setItem('mapsData_Lat', currentMapsData.latLng.lat);
                        window.localStorage.setItem('mapsData_Lng', currentMapsData.latLng.lng);
                    }

                }
                if (valueZoom !== undefined) {
                    currentMapsData.zoom = valueZoom;
                    if (isLocalStorageAvailable) {
                        window.localStorage.setItem('mapsData_zoom', currentMapsData.zoom);
                    }
                }
                //    if change map's position -> save to session history and for arrows: undo, redo
                if (!isClickUndoOrRedo) {
                    if (latLng !== undefined && valueZoom !== undefined) {
                        var mapsData = {
                            lat: latLng.lat,
                            lng: latLng.lng,
                            zoom: valueZoom
                        };
                        addActionToSessionHistory(mapsData);
                    }
                }
                if (mapTypeId !== undefined) {
                    currentMapsData.mapTypeId = mapTypeId;
                    if (isLocalStorageAvailable) {
                        window.localStorage.setItem('mapsData_mapTypeId', mapTypeId);
                    }
                }
                objFormationHashUrl.updateUrlWithCurrentState();
            },

            restoreSavedMapsData: function () {
                var defaultInitMapsData = {
                    zoom: 13,
                    lat: 52.721246,
                    lng: 41.452238,
                    map: 'google',
                    mapTypeId: 'roadmap'
                };
                if (!isLocalStorageAvailable) {
                    var checkedDataFromUrl = getDataFromUrlWithCheck();

                    if (!checkedDataFromUrl.badDataFromUrl) {
                        //    good data from url
                        return checkedDataFromUrl;
                    } else {
                        return defaultInitMapsData;
                    }
                } else {
                    var initMapsDataFromStorage = {};

                    var checkedDataFromUrl = getDataFromUrlWithCheck();

                    if (!checkedDataFromUrl.badDataFromUrl) {
                        //    good data from url
                        return checkedDataFromUrl;
                    }

                    // get data from localStorage
                    var zoom = parseInt(window.localStorage.getItem('mapsData_zoom'));
                    var lat = parseFloat(window.localStorage.getItem('mapsData_Lat'));
                    var lng = parseFloat(window.localStorage.getItem('mapsData_Lng'));
                    var nameMap = window.localStorage.getItem('mapsData_map');
                    var mapTypeId = window.localStorage.getItem('mapsData_mapTypeId');

                    if (Number.isInteger(zoom)) {
                        initMapsDataFromStorage.zoom = zoom;
                    } else {
                        //initMapsDataFromStorage.zoom = defaultInitMapsData.zoom;
                        return defaultInitMapsData;
                    }

                    if (Number.isNumeric(lat)) {
                        initMapsDataFromStorage.lat = lat;
                    } else {
                        //initMapsDataFromStorage.lat = defaultInitMapsData.lat;
                        return defaultInitMapsData;
                    }

                    if (Number.isNumeric(lng)) {
                        initMapsDataFromStorage.lng = lng;
                    } else {
                        //initMapsDataFromStorage.lng = defaultInitMapsData.lng;
                        return defaultInitMapsData;
                    }

                    // search in array
                    if (nameOfMaps.indexOf(nameMap) !== -1) {
                        initMapsDataFromStorage.map = nameMap;
                    } else {
                        //initMapsDataFromStorage.map = defaultInitMapsData.map;
                        return defaultInitMapsData;
                    }

                    // get mapTypeId
                    // not found layer for checked map
                    if (nameMap === 'google' && (possibleMapTypeIdGoogle.indexOf(mapTypeId) === -1)) {
                        return defaultInitMapsData;
                    } else if (nameMap === 'yandex' && (possibleMapTypeIdYandex.indexOf(mapTypeId) === -1)) {
                        return defaultInitMapsData;
                    }
                    initMapsDataFromStorage.mapTypeId = mapTypeId;
                    return initMapsDataFromStorage;
                }
            },

            addEventListenerToSessionHistoryAndRestoreHistory: function () {
                //    restore saved data
                var restoredNumberCurrentActionSessionHistory = parseInt(window.sessionStorage.getItem('numberCurrentActionSessionHistory'));
                if (Number.isNumeric(restoredNumberCurrentActionSessionHistory)) {
                    numberCurrentActionSessionHistory = parseInt(restoredNumberCurrentActionSessionHistory);
                    if (!Number.isInteger(numberCurrentActionSessionHistory)) {
                        numberCurrentActionSessionHistory = undefined;
                    }
                }
                var restoredArraySessionHistory = JSON.parse(window.sessionStorage.getItem('arraySessionHistory'));
                if (!Array.isArray(restoredArraySessionHistory)) {
                    arraySessionHistory = [];
                } else {
                    arraySessionHistory = restoredArraySessionHistory;
                }

                if ((numberCurrentActionSessionHistory > (arraySessionHistory.length - 1)) && (numberCurrentActionSessionHistory !== 0)) {
                    numberCurrentActionSessionHistory = undefined;
                    arraySessionHistory = [];
                }

                // click to undo
                btnUndo.click(function (event) {
                    clickUndo();
                    event.stopPropagation();
                });

                btnUndo.bind('dbclick', function (event) {
                    event.stopPropagation();
                });
                // click to redo
                btnRedo.click(function (event) {
                    clickRedo();
                    event.stopPropagation();
                });

                btnRedo.bind('dbclick', function (event) {
                    event.stopPropagation();
                });
            },

            getActiveMapTypeIdForMap: function (nameMap) {
                switch (nameMap) {
                    case 'google':
                        return googleMaps.mapTypeId;
                        break;
                    case 'yandex':
                        return yandexMaps._type;
                        break;
                    case 'leaflet':
                        var mapTypeIdLeaflet = $('#leafletMaps .leaflet-control-layers-list .leaflet-control-layers-base label input:checked').parent().find('span').eq(0).text().trim();
                        return mapTypeIdLeaflet;
                        break
                }
            }

        };

        return objInterface;
    })();

    // object for initialization individual maps
    var objInitMaps = (function () {

        var initialZoom, initialLat, initialLng, defaultOrSavedNameMap, initialMapTypeId;

        // initialize maps data
        (function initMapsData() {
            //    get saved data or default data
            var restoredData = objUtilHistory.restoreSavedMapsData();

            initialZoom = restoredData.zoom;
            initialLat = restoredData.lat;
            initialLng = restoredData.lng;
            defaultOrSavedNameMap = restoredData.map;
            initialMapTypeId = restoredData.mapTypeId;

            // init var currentMapsOptions
            currentMapsData.zoom = initialZoom;
            currentMapsData.map = defaultOrSavedNameMap;
            currentMapsData.latLng = {
                lat: initialLat,
                lng: initialLng
            };
            currentMapsData.mapTypeId = initialMapTypeId;
        })();

        //  add event listener for toggle buttons of maps
        (function addListenersOfSwitchesMaps() {
            //    get div - container of maps
            //var containerMaps = $('#containerMaps');
            var changeMapsForFullScreen = function (nameActiveMap, isNeedGoToFullscreen) {

                switch (nameActiveMap) {
                    case 'google':
                        // check other maps for exit from fullscreen
                        if (isYandexMapsFullScreen) {
                            var fullscreenControl = yandexMaps.controls.get('fullscreenControl');
                            fullscreenControl.exitFullscreen();
                            isYandexMapsFullScreen = false;
                        }
                        if (isLeafletMapsFullScreen) {
                            leafletMaps.toggleFullscreen({pseudoFullscreen: true});
                            isLeafletMapsFullScreen = false;
                        }
                        // go to fullscreen for clicked map
                        if (!isGoogleMapsFullScreen && isNeedGoToFullscreen) {
                            $buttonFullscreenGoogleMaps.trigger('click');
                            isGoogleMapsFullScreen = true;
                        }
                        break;
                    case 'yandex':
                        if (isLeafletMapsFullScreen) {
                            leafletMaps.toggleFullscreen({pseudoFullscreen: true});
                            isLeafletMapsFullScreen = false;
                        }
                        if (isGoogleMapsFullScreen) {
                            $buttonFullscreenGoogleMaps.trigger('click');
                            isGoogleMapsFullScreen = false;
                        }
                        if (!isYandexMapsFullScreen && isNeedGoToFullscreen) {
                            var fullscreenControl = yandexMaps.controls.get('fullscreenControl');
                            fullscreenControl.enterFullscreen();
                            isYandexMapsFullScreen = true;
                        }
                        break;
                    case 'leaflet':
                        if (isYandexMapsFullScreen) {
                            var fullscreenControl = yandexMaps.controls.get('fullscreenControl');
                            fullscreenControl.exitFullscreen();
                            isYandexMapsFullScreen = false;
                        }
                        if (isGoogleMapsFullScreen) {
                            $buttonFullscreenGoogleMaps.trigger('click');
                            isGoogleMapsFullScreen = false;
                        }
                        if (!isLeafletMapsFullScreen && isNeedGoToFullscreen) {
                            leafletMaps.toggleFullscreen({pseudoFullscreen: true});
                            isLeafletMapsFullScreen = true;
                        }
                        break;
                }
            };

            var isCurrentMapInFullscreen = function () {
                switch (currentMapsData.map) {
                    case 'google':
                        return isGoogleMapsFullScreen;
                        break;
                    case 'yandex':
                        return isYandexMapsFullScreen;
                        break;
                    case 'leaflet':
                        return isLeafletMapsFullScreen;
                        break;
                }
            };
            //    clicked on google maps
            $('#buttonGoogle').click(function () {
                //    get div - google maps
                //var containerGoogleMaps = $('#googleMaps');
                $containerAllMaps.prepend($containerGoogleMaps);

                //    enable google listen
                objChangeMapsListeners.addListenersChangedPositionGoogle();

                //    disable yandex listen
                objChangeMapsListeners.removeListenersChangedPositionYandex();
                //    disable leaflet listen
                objChangeMapsListeners.removeListenersChangedPositionLeaflet();

                objChangeMapsBounds.onceChangePositionOfGoogleMaps();
                changeMapsForFullScreen('google', isCurrentMapInFullscreen());
                objUtilHistory.saveCurrentDataMap('google');
            });

            //    clicked on yandex maps
            $('#buttonYandex').click(function () {
                //var containerYandexMaps = $('#yandexMaps');
                $containerAllMaps.prepend($containerYandexMaps);

                // enable yandex listen
                objChangeMapsListeners.addListenersChangedPositionYandex();
                //    disable google listen
                objChangeMapsListeners.removeListenersChangedPositionGoogle();
                //    disable leaflet listen
                objChangeMapsListeners.removeListenersChangedPositionLeaflet();

                objChangeMapsBounds.onceChangePositionOfYandexMaps();
                changeMapsForFullScreen('yandex', isCurrentMapInFullscreen());
                objUtilHistory.saveCurrentDataMap('yandex');
            });

            //    clicked on leaflet maps
            $('#buttonLeaflet').click(function () {
                //var containerLeafletMaps = $('#leafletMaps');
                $containerAllMaps.prepend($containerLeafletMaps);

                //    enable leaflet listen
                objChangeMapsListeners.addListenersChangedPositionLeaflet();
                //    disable google listen
                objChangeMapsListeners.removeListenersChangedPositionGoogle();
                //    disable yandex listen
                objChangeMapsListeners.removeListenersChangedPositionYandex();

                objChangeMapsBounds.onceChangePositionOfLeafletMaps();
                changeMapsForFullScreen('leaflet', isCurrentMapInFullscreen());
                objUtilHistory.saveCurrentDataMap('leaflet');
            });

        })();

        var interfaceObj = {
            // init google maps
            initGoogleMaps: function () {

                var divGoogleMap = document.getElementById('googleMaps');

                googleMaps = new google.maps.Map(divGoogleMap, {
                    center: {
                        lat: initialLat,
                        lng: initialLng
                    },
                    zoom: initialZoom,
                    scaleControl: true,
                    zoomControl: true,
                    zoomControlOptions: {
                        position: google.maps.ControlPosition.LEFT_TOP
                    },
                    streetViewControl: true,
                    streetViewControlOptions: {
                        position: google.maps.ControlPosition.LEFT_TOP
                    },
                    fullScreenControl: true,
                    mapTypeControl: false
                });

                // set mapTypeId
                if (currentMapsData.map === 'google') {
                    googleMaps.setOptions({
                        mapTypeId: initialMapTypeId
                    });
                }

                // add event listener for change type of layer
                google.maps.event.addListener(googleMaps, 'maptypeid_changed', function () {
                    console.log('maptypeid_ch');
                    var mapTypeId = googleMaps.mapTypeId;
                    objUtilHistory.saveCurrentDataMap(undefined, undefined, undefined, undefined, mapTypeId);

                });

                // add button full screen
                var buttonFullScreen = objFullScreenControl.createFullScreenControl(googleMaps);
                google.maps.event.addDomListener(buttonFullScreen, 'click', function () {
                    //    check full screen
                    if (!isGoogleMapsFullScreen) {
                        //    to full screen
                        $containerOwnControls.css('position', 'fixed');
                    } else {
                        //    from full screen
                        $containerOwnControls.css('position', 'absolute');
                    }
                    isGoogleMapsFullScreen = !isGoogleMapsFullScreen;
                });

                googleMaps.controls[google.maps.ControlPosition.TOP_RIGHT].push(buttonFullScreen);
                $buttonFullscreenGoogleMaps = $(buttonFullScreen);
                //    add map controls
                googleMaps.setOptions({
                    mapTypeControl: true,
                    mapTypeControlOptions: {
                        mapTypeIds: [google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.SATELLITE, google.maps.MapTypeId.HYBRID, google.maps.MapTypeId.TERRAIN],
                        position: google.maps.ControlPosition.TOP_RIGHT,
                        style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
                    }
                });
                //    add button traffic control
                var buttonTrafficControl = objTrafficControl.createTrafficControl(googleMaps);
                googleMaps.controls[google.maps.ControlPosition.TOP_RIGHT].push(buttonTrafficControl);
                //    add ruler control
                gmruler.init(googleMaps);
                var buttonRulerControl = objRulerControl.createRulerControl(googleMaps);
                googleMaps.controls[google.maps.ControlPosition.TOP_RIGHT].push(buttonRulerControl);

                //    add geocoder control
                var controlGeocoderGoogle = objGeocodingControl.createGeocodingControl(googleMaps);
                googleMaps.controls[google.maps.ControlPosition.TOP_LEFT].push(controlGeocoderGoogle);

                //    add route conrtol
                var controlRouteGoogle = objRouteControl.createRouteControl(googleMaps, 'googleMaps');
                googleMaps.controls[google.maps.ControlPosition.TOP_LEFT].push(controlRouteGoogle);
            },

            // init yandex maps
            initYandexMaps: function () {
                yandexMaps = new ymaps.Map("yandexMaps", {
                    center: [initialLat, initialLng],
                    zoom: initialZoom,
                    controls: ['default', 'routeEditor', 'typeSelector']
                }, {
                    // remove link to yandex maps
                    suppressMapOpenBlock: true
                });

                // set mapTypeId
                if (currentMapsData.map === 'yandex') {
                    yandexMaps.setType(initialMapTypeId);
                }

                // add event listener - change type of layer
                yandexMaps.events.add('typechange', function () {
                    var mapTypeId = yandexMaps._type;
                    console.log('Change map type yandex = ' + mapTypeId);
                    objUtilHistory.saveCurrentDataMap(undefined, undefined, undefined, undefined, mapTypeId);
                });

                // chnage position ruler control
                var rulerControlOptions = yandexMaps.controls.get('rulerControl').options;
                rulerControlOptions.set('position', 0);
                rulerControlOptions.set('float', 'right');
                rulerControlOptions.set('scaleLine', false);

                //    remove geolocation control
                yandexMaps.controls.remove('geolocationControl');

                //    add event listener for control fullscreen
                var fullscreenControl = yandexMaps.controls.get('fullscreenControl');
                fullscreenControl.events.add('fullscreenenter', function () {
                    isYandexMapsFullScreen = true;
                    $containerOwnControls.css('position', 'fixed');
                });
                fullscreenControl.events.add('fullscreenexit', function () {
                    isYandexMapsFullScreen = false;
                    $containerOwnControls.css('position', 'absolute');
                });

            },

            // init leaflet library
            initLeafLet: function () {

                var layerOpenStreetMap = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                });

                var outdoorsMapbox = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/outdoors-v9/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiYXJ0YW1vbm92ZGV2IiwiYSI6ImNpcWxjZDVzYzAwMDdpMm5rd2ExcWU3dGIifQ.Jb7HrbPnDjv7SSFxY1bV5Q', {
                    maxZoom: 18,
                    attribution: '&copy; Mapbox'
                });

                var streetsMapbox = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/streets-v9/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiYXJ0YW1vbm92ZGV2IiwiYSI6ImNpcWxjZDVzYzAwMDdpMm5rd2ExcWU3dGIifQ.Jb7HrbPnDjv7SSFxY1bV5Q', {
                    maxZoom: 18,
                    attribution: '&copy; Mapbox'
                });

                var thunderforestCicle = L.tileLayer('https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png', {
                    maxZoom: 18,
                    attribution: '&copy; Thunderforest'
                });

                var thunderforestLandscape = L.tileLayer('https://{s}.tile.thunderforest.com/landscape/{z}/{x}/{y}.png', {
                    maxZoom: 18,
                    attribution: '&copy; Thunderforest'
                });

                var thunderforestOutdoors = L.tileLayer('https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png', {
                    maxZoom: 18,
                    attribution: '&copy; Thunderforest'
                });

                var hikeBike = L.tileLayer('http://{s}.tiles.wmflabs.org/hikebike/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '&copy; OpenStreetMap'
                });

                var hikeBike_HillShading = L.tileLayer('http://{s}.tiles.wmflabs.org/hillshading/{z}/{x}/{y}.png', {
                    maxZoom: 15,
                    attribution: '&copy; OpenStreetMap'
                });


                leafletMaps = L.map('leafletMaps', {
                    fullscreenControl: {
                        pseudoFullscreen: true // if true, fullscreen to page width and height
                    },
                    layers: [layerOpenStreetMap]
                }).setView([initialLat, initialLng], initialZoom);

                // AerialWithLabels | BirdseyeWithLabels | Road

                var bingAerialWithLabels = new L.BingLayer("AlQ2NPT6YL91Ka2qoYquJntyfzRM9hSgcQzKuZVrOVx8M0crC8qdqvQ2H6tLzYEw", {type: 'AerialWithLabels'});

                var bingRoad = new L.BingLayer("LfO3DMI9S6GnXD7d0WGs~bq2DRVkmIAzSOFdodzZLvw~Arx8dclDxmZA0Y38tHIJlJfnMbGq5GXeYmrGOUIbS2VLFzRKCK0Yv_bAl6oe-DOc", {type: 'Road'});

                var trafficLayer = MQ.trafficLayer();

                var baseMaps = {
                    'OSM': layerOpenStreetMap,
                    'Hike,_bike': hikeBike,
                    'Bing_Outdoors': bingAerialWithLabels,
                    'Bing_road': bingRoad,
                    'Thunderforest_Landscape': thunderforestLandscape,
                    'Thunderforest_Cicle': thunderforestCicle,
                    'Thunderforest_Outdoors': thunderforestOutdoors,
                    'Mapbox_Outdoors': outdoorsMapbox,
                    'Mapbox_streets': streetsMapbox

                };

                var overlays = {
                    'Shading': hikeBike_HillShading,
                    'Traffic layer': trafficLayer
                };

                L.control.layers(baseMaps, overlays, {position: 'topright'}).addTo(leafletMaps);

                // add measure control
                L.Control.measureControl().addTo(leafletMaps);

                //    add geocoder control
                geocoderControl = new L.Control.Geocoder();
                // drop-down menu for select provider of geocoding
                layersLeaflet = new L.Control.ProvidersGeocoding({geocoderControl: geocoderControl}).addTo(leafletMaps);
                geocoderControl.addTo(leafletMaps);

                //    add routing control
                var routeControl = L.Routing.control({
                    collapsible: true,
                    show: false,
                    routeWhileDragging: true,
                    router: L.Routing.mapbox('pk.eyJ1IjoiYXJ0YW1vbm92ZGV2IiwiYSI6ImNpcWxjZDVzYzAwMDdpMm5rd2ExcWU3dGIifQ.Jb7HrbPnDjv7SSFxY1bV5Q', {profile: 'mapbox.walking'})
                    //router: L.Routing.graphHopper('a97c8794-d899-4719-879d-faefd681b6dc')
                    //router: L.Routing.mapzen('valhalla-34rsQXm', {costing:'auto'}),
                    //formatter: new L.Routing.mapzenFormatter()
                }).addTo(leafletMaps);

                // add event listener - changed base layer
                leafletMaps.on('baselayerchange', function (event) {
                    console.log('Change layer leaflet:');
                    var mapTypeId = event.name;
                    objUtilHistory.saveCurrentDataMap(undefined, undefined, undefined, undefined, mapTypeId);
                });

                new L.Control.RoutingWithClicks({'routeControl': routeControl, 'map': leafletMaps}).addTo(leafletMaps);

                //    add event listenre for fullscreen
                leafletMaps.on('fullscreenchange', function () {
                    if (leafletMaps.isFullscreen()) {
                        isLeafletMapsFullScreen = true;
                        $containerOwnControls.css('position', 'fixed');
                        console.log('fixed');
                    } else {
                        isLeafletMapsFullScreen = false;
                        $containerOwnControls.css('position', 'absolute');
                        console.log('absolute');
                    }
                });


                // set mapTypeId
                if (currentMapsData.map === 'leaflet') {
                    //yandexMaps.setType(initialMapTypeId);
                    console.log('LEAFLET ACTIVE!!!');
                    console.log(initialMapTypeId);
                    // for each label
                    var mapTypeIdFromUrlEqualFromList = false;
                    $('#leafletMaps .leaflet-control-layers-list .leaflet-control-layers-base label span').each(function () {
                        var $thisElement = $(this);
                        var textOfLabel = $thisElement.text().trim();
                        initialMapTypeId = initialMapTypeId.trim();
                        if (initialMapTypeId === textOfLabel) {
                            console.log('EQUAL');
                            mapTypeIdFromUrlEqualFromList = true;
                            $thisElement.parent().find('input').eq(0).trigger('click');
                        }
                    });
                }

            },

            // show map from localStorage or default map ('google')
            showPreviousMapOrDefault: function () {
                //var containerMaps = $('#containerMaps');
                switch (defaultOrSavedNameMap) {
                    case 'google':
                        //var containerGoogleMaps = $('#googleMaps');
                        $containerAllMaps.prepend($containerGoogleMaps);
                        objChangeMapsListeners.addListenersChangedPositionGoogle();
                        break;
                    case 'yandex':
                        //var containerYandexMaps = $('#yandexMaps');
                        $containerAllMaps.prepend($containerYandexMaps);
                        objChangeMapsListeners.addListenersChangedPositionYandex();
                        break;
                    case 'leaflet':
                        //var containerLeafletMaps = $('#leafletMaps');
                        $containerAllMaps.prepend($containerLeafletMaps);
                        objChangeMapsListeners.addListenersChangedPositionLeaflet();
                        break;
                    default:
                        //var containerGoogleMaps = $('#googleMaps');
                        $containerAllMaps.prepend($containerGoogleMaps);
                        objChangeMapsListeners.addListenersChangedPositionGoogle();
                        break
                }
            }
        };

        return interfaceObj;
    })();

    function initApp() {
        //    init google maps
        objInitMaps.initGoogleMaps();
        //    init yandex maps
        objInitMaps.initYandexMaps();
        //    init leaflet maps
        objInitMaps.initLeafLet();
        // show previous (saved) map or default
        objInitMaps.showPreviousMapOrDefault();
        //    enable listen in other tabs
        objUtilHistory.initListenInOtherTabs();
        //    enable listen arrow (undo | redo)
        objUtilHistory.addEventListenerToSessionHistoryAndRestoreHistory();
        //    change url
        objFormationHashUrl.updateUrlWithCurrentState();

    }

    ymaps.ready(initApp);

});