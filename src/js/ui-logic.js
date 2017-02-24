/**
 * Обращаться по поводу разработки: artamonovdev@gmail.com
 */
$(document).ready(function () {
    var $rightMenu = $('#rightMenu');
    var $containerIcoOpenSlider = $('#containerIcoOpenSlider');
    var $icoOpenSlider = $('#icoOpenSlider');
    var savedWidthOfBlock = 400;
    var defaultWidthOfBlock = savedWidthOfBlock;

    var resizeMaps = function () {
        $(document).trigger('resize_maps');
    };

    $icoOpenSlider.bind('mousedown mouseup', function (event) {
        event.stopPropagation();
    });

    $icoOpenSlider.click(function (event) {
        console.log('click toggle side');
        if ($rightMenu.css('display') !== 'none') {
            //    hide
            //    save previous width of block
            savedWidthOfBlock = $rightMenu.outerWidth();
            $(this).css('transform', 'rotateY(0deg)');
            $rightMenu.css({
                'display': 'none',
                'width': '0px'
            });

            //    resize maps
            resizeMaps();
        } else {
            //    show
            $(this).css('transform', 'rotateY(180deg)');
            $rightMenu.css({
                'display': 'block'
            });
            if (savedWidthOfBlock > 100) {
                $rightMenu.css({
                    'width': (savedWidthOfBlock + 'px')
                });
            } else {
                $rightMenu.css({
                    'width': (defaultWidthOfBlock + 'px')
                });
            }
        }
        event.stopPropagation();
    });

    $containerIcoOpenSlider.on('mousedown', function () {
        console.log('mousedown');
        $rightMenu.css({
            'display': 'block'
        });
        $icoOpenSlider.css('transform', 'rotateY(180deg)');
        var menuWidth;
        var halfWidthLeftPanel = parseInt($containerIcoOpenSlider.outerWidth() / 1.5);
        $(document).on('mousemove.slider', function (event) {
            console.log('mousemove');
            //console.log(event);
            //clearTimeout(timeoutMove);
            //timeoutMove = setTimeout(function () {
            //    change width of right menu

            menuWidth = window.innerWidth - event.pageX - halfWidthLeftPanel;
            $rightMenu.css('width', menuWidth + 'px');
            console.log('change width ' + menuWidth);
            //}, 10);
            event.stopPropagation();
        });
        $(document).on('mouseup.slider', function (event) {
            console.log('mouseup');
            $(document).off('.slider');
            resizeMaps();
            event.stopPropagation();
        });
    });
});