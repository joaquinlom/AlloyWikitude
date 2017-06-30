// Arguments passed into this controller can be accessed via the `$.args` object directly or:
var args = $.args;
/**
 *  Propiedades de inicializacion
 */
var arquitectWorld = args.url;
var textShare = (args.textShare)?args.textShare: 'Share with '+Ti.App.getName();
var actionBarVisible = (args.actionBar !== null)?args.actionBar:true;
var canShare = (args.canShare !== null)?args.canShare:true;
var actionBarColor = (args.actionBarColor)?args.actionBarColor:'#000';
var actionBarTitulo = (args.titulo)?args.titulo:'';
var cameraSoundEnabled = (args.cameraSound)?args.cameraSound:true;
var wikitudeKey = args.wikitudeKey;
var wikitudeLibrary = require('com.wikitude.ti');
var augmentedRealityFeatures = (args.ARFeatures)?args.ARFeatures:["2d_tracking"];
var initialJs = args.initialJs;
var wikitudeView;
var currentImageToShare = '';

var canRotate = args.rotate;
//Fin de propiedades

/*
 * Configuracion de la ventana
 */
if(!wikitudeKey || !arquitectWorld)
{
	alert("Url/wikitude key need it");
	close();
}

Ti.API.info("Can rotate:"+canRotate);
if(canRotate){
	$.widget.orientationModes = [Ti.UI.LANDSCAPE_LEFT,Ti.UI.LANDSCAPE_RIGHT,Ti.UI.PORTRAIT];
	Ti.API.info(JSON.stringify($.widget.orientationModes));
}else{
	$.widget.orientationModes = [Ti.UI.PORTRAIT];
}

wikitudeView = wikitudeLibrary.createWikitudeView({
            "licenseKey": wikitudeKey,
            "augmentedRealityFeatures": augmentedRealityFeatures,
            bottom: 0,
            left: 0,
            right: 0,
            top: 50,
});




$.RA.add(wikitudeView);

if(OS_ANDROID)
{
	$.dialog.setTitle(textShare);
}else
{
	$.titleSharing.setText(textShare);
}

if(!actionBarVisible)
{
	wikitudeView.top = 0;
	$.actionBar.hide();
	//alert("Sin action bar");
}
if(!canShare)
{
	$.cameraButton.hide();
}
$.backButton.image = WPATH('/arrow-left.png');
$.cameraButton.image = WPATH('/camera_icon.png');
$.title.setText(actionBarTitulo);
wikitudeView.loadArchitectWorldFromURL(arquitectWorld,augmentedRealityFeatures,{
                    "camera_position": "back"
});
//Fin de configuracion


/**
 *  Eventos
 */
if(!OS_ANDROID)
{
	$.cancelShare.addEventListener('singletap',function(e)
	{
	    $.sharingHolder.hide();
	});


	$.shareImage.addEventListener('singletap',function(e)
	{
	    var docViewer = Ti.UI.iOS.createDocumentViewer({url:currentImageToShare});
	    docViewer.show({view: $.shareImage, animated: true});
	});
}
wikitudeView.addEventListener('WORLD_IS_LOADED', onWorldLoaded);
wikitudeView.addEventListener('URL_WAS_INVOKED',onURLinvoked);
$.widget.addEventListener('open',function()
{
	if(!Ti.Media.hasCameraPermissions()){
			Ti.Media.requestCameraPermissions(function(e)
			{
				if(!e.success)
				{
					alert("Camera permission need it");
					close();
				}
			});
	}

	if(args.location)
	{
		wikitudeView.injectLocation(args.location);
	}

});

//Fin eventos

/**
 * Funciones privadas
 */


function onURLinvoked(event)
{
    if(event.url.indexOf('changeWorld') != -1)
    {
    		Ti.API.info("Se cargo nuevo Mundo");
    		var url = event.url.substr(event.url.indexOf("=") + 1);
   		Widget.createController('widget',{url: url,wikitudeKey: wikitudeKey,canShare:true,actionBar:true}).getView().open();
    }

    //Take Screenshot
    if(event.url.indexOf('takeScreenshoot') != -1)
    {
	    	takeSS();
	    	return;
    }

    if(event.url.indexOf('closeWorld') != -1)
    {
   	 	close();
    }

    if(event.url.indexOf('showMessage') != -1)
    {
    		var message = event.url.substr(event.url.indexOf("=") + 1);
    		showToast(message.replace('&',''));
    }
    if(event.url.indexOf('hideActionBar')!= -1)
    {
	    	$.actionBar.hide();
	    	wikitudeView.top = 0;
    }
    if(event.url.indexOf('showActionBar')!= -1)
    {
   	 	$.actionBar.show();
    		wikitudeView.top = 50;
    }
    if(event.url.indexOf('changeTitle') != -1)
    {

   	 	var title = event.url.substr(event.url.indexOf("=") + 1);
   	 	Ti.API.info("Cambiar Titulo a: "+title);
   		if(title != '' && title != 'undefined')
   		{
   			$.title.text = title.replace('&','');
   		}
    }
}

function onWorldLoaded(event)
{
	if (true === event.result) {
        Ti.API.info('world loaded');
        if(initialJs)
        {
        		wikitudeView.callJavaScript(initiaJs);
        }
    } else {
   	 	alert("no cargo");
        Ti.API.error('error loading ARchitect World: ' + event.error);
    }
}

function takeSS(){
	//soundCamera.play();
	var directory = Ti.Filesystem.getApplicationDirectory();
	if(OS_ANDROID)
	{
		wikitudeView.captureScreen(true,null, {
        onSuccess: function(path) {
	            Ti.API.error('success: ' + path);
	            currentImageToShare = path;
	            $.imageToShare.image = 'file://'+path;
	            $.dialog.show();
	        },
	        onError: function(errorDescription) {
	            alert('error: ' + errorDescription);
	        }
    		});
	}else
	{
		var fileToShare = null;
		// generate image from screen
		Ti.Media.takeScreenshot(function(e)
		{
			fileToShare = Titanium.Filesystem.getFile(Titanium.Filesystem.applicationDataDirectory,'Time+'+ID()+'.jpg');

			fileToShare.write(e.media);
			Ti.Media.saveToPhotoGallery(e.media,{
		        success: function(e){
		            Ti.API.info('Saved image to gallery');
		        },
		        error: function(e){
		            Ti.API.info("Error trying to save the image.");
		        }
		    });


			Ti.API.info(fileToShare.nativePath);
			currentImageToShare = fileToShare.nativePath;
			$.imageToShare.image = currentImageToShare;
			$.sharingHolder.show();
		});
	}
}

function close()
{
	$.widget.close();
	$.RA.remove(wikitudeView);
	wikitudeView = null;
}

function showToast(msg)
{
	if(OS_ANDROID)
	{
		var toast = Ti.UI.createNotification({
			message:msg,
			duration: Ti.UI.NOTIFICATION_DURATION_LONG
		});
		toast.show();
	}else
	{
		alert(msg);
	}
}

function shareImage(image)
{
		var fileToShare = null;
		fileToShare =  Titanium.Filesystem.getFile(Titanium.Filesystem.externalStorageDirectory,image);

		var intent = Ti.Android.createIntent({
			type: "image/*",
			action: Ti.Android.ACTION_SEND
			});

		intent.putExtraUri(Ti.Android.EXTRA_STREAM,'file://'+image);
		intent.putExtra(Ti.Android.EXTRA_TEXT,textShare);
		var chooser = Ti.Android.createIntentChooser(intent, textShare);
		//var activity = Ti.Android.currentActivity.startActivity(chooser);
		Ti.Android.currentActivity.startActivity(chooser);
}
function toShareImage(e)
{
	Ti.API.error(JSON.stringify(e));
	var index = e.index;
				if(e.cancel)
				{
						this.hide();
						return;
				}
				if(index == 0)
				{
						shareImage(currentImageToShare);
						this.hide();
				}
}
function ID() {
  // Math.random should be unique because of its seeding algorithm.
  // Convert it to base 36 (numbers + letters), and grab the first 9 characters
  // after the decimal.
  return '_' + Math.random().toString(36).substr(2, 9);
};
/**
 * Funciones publicas
 */
$.closeWindow = function()
{
	 	$.close();
};

$.callJavascript = function(javascript){
	wikitudeView.callJavaScript(javascript);
};
//Fin de funciones publicas
