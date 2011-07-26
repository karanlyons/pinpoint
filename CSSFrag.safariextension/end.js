// HELPER FUNCTIONS

function offsetXY(element) {
	//
	// Returns the x and y coordinates of the closest positioned element as integers.
	//
	
	var x = y = 0;
	if (element.offsetParent) {
		do {
			x += element.offsetLeft;
			y += element.offsetTop;
		} while (element = element.offsetParent);
	}
	return {'x': x,'y': y};
}

function nthIndex(element) {
	//
	// Returns the element's DOM position amongst its children as an integer.
	//
	

	var nodes = element.parentNode.childNodes, node;
	var i = 0;
	var count = 1;
	
	while((node = nodes.item(i++)) && (node != element)) {
		if (node.nodeType == 1) count++;
	}
	
	return count;
}

function singleElementWithID(id) {
	//
	// Returns true if the ID has only one corresponding element (as *should* always be the case).
	//
	
	var element = document.getElementById(id);
	var elements = [];
	
	while(element) {
		elements.push(element);
		element.id = id + "_CSSFrag";
		element = document.getElementById(id);
	}

	for(var i = 0; i < elements.length; i++) {
		elements[i].id = id;
	}
	return (elements.length == 1);
}

function colorToRGBADictionary(color) {
	//
	// Returns a Hexadecimal, RGB, or RGBA color as an RGBA dictionary. If the color cannot be parsed, returns false.
	//
	
	if (color.substring(0, 1) === '#') {
		color = color.replace('#', '');
		if (color.length === 3) {
			var rgb = color.replace('#', '').match(/(.{1})/g);
			rgb[0] += rgb[0];
			rgb[1] += rgb[1];
			rgb[2] += rgb[2];
		}
		else if (color.length === 6) { var rgb = color.replace('#', '').match(/(.{2})/g); }
		else { return false; }
		var i = 3;
		while (i--) { rgb[i] = parseInt(rgb[i], 16); }
		return {'r': rgb[0], 'g': rgb[1], 'b': rgb[2], 'a': 1};
	}
	else if (color.substring(0, 3) === 'rgb') {
		var rgba = color.match(/([^a-z\(\), ]+)/g);
		if (rgba.length <= 3) { return false; } // This check isn't perfect (it should freak out over stuff like rgba(0,a,1,1)), but it's good enough.
		return {'r': rgba[0], 'g': rgba[1], 'b': rgba[2], 'a': (rgba[3] || 1)};
	}
	else { return false; }
	
}

function highlightBackground(element, startColor, duration) {
	//
	// Fades the background color of an element from yellow to the endColor, finally replacing it with the endAttribute. Basically, it's the YFT.
	//
	var steps = duration / 50;
	var currentFloatColor = JSON.parse(JSON.stringify(startColor)); // More hacks. This time we're serializing and deserializing an object to get a copy instead of a reference.
	var endColor = colorToRGBADictionary(element.style.backgroundColor);
	if (!endColor) {
		endColor = JSON.parse(JSON.stringify(startColor));
		endColor.a = 0;
	}
	var endAttribute = element.style.backgroundColor; // We reset to the original attirbute at the end of the fade just in case we became a little off from parseInt.
	var stepCount = 0;

			element.style.backgroundColor = "rgba(" + parseInt(currentFloatColor.r) + "," + parseInt(currentFloatColor.g) + "," + parseInt(currentFloatColor.b) + "," + currentFloatColor.a + ")";
	
	var timer = setInterval(function() {
		currentFloatColor.r = currentFloatColor.r - ((currentFloatColor.r - endColor.r) / (steps - stepCount));
		currentFloatColor.g = currentFloatColor.g - ((currentFloatColor.g - endColor.g) / (steps - stepCount));
		currentFloatColor.b = currentFloatColor.b - ((currentFloatColor.b - endColor.b) / (steps - stepCount));
		currentFloatColor.a = currentFloatColor.a - ((currentFloatColor.a - endColor.a) / (steps - stepCount));
		
		element.style.backgroundColor = "rgba(" + parseInt(currentFloatColor.r) + "," + parseInt(currentFloatColor.g) + "," + parseInt(currentFloatColor.b) + "," + currentFloatColor.a + ")";
		
		stepCount++;
		
		if (stepCount >= steps) {
			element.style.backgroundColor = endAttribute; 
			clearInterval(timer);
		}
	}, 50);
}

function scrollFocusAndHighlight(selector, isFragHash) {
	//
	// Given a selector and whether it is a frag hash, finds the element in the document and scrolls and focuses on it. If the user wants it, we also highlight the element.
	//
	var element = document.querySelector(selector);
	if (element === null) { return false; }
	var offset = offsetXY(element);
	
	window.scrollTo(offset.x, offset.y);
	element.focus();
	if (settings.highlightTarget !== 'none' && (settings.highlightTarget === 'all' || (isFragHash && settings.highlightTarget === 'frag'))) {
		highlightBackground(element, (colorToRGBADictionary(settings.highlightColor) || {'r': 255, 'g': 255, 'b': 156, 'a': 1}), 2000);
	}
}


// CSSFrag

function handleContextMenu(event) {
	//
	// Sets display to true only if the event target is something discrete.
	//
	
	var display = true;
	var nodeName = event.target.nodeName.toLowerCase();
	var nodeID = event.target.getAttribute('id');
	
	var eventTargets = document.getElementsByClassName("CSSFragTarget"); // Safari doesn't allow passing elements through setContextMenuEventUserInfo, so we're doing it through the DOM.
	if (eventTargets.length > 0) {
		for (var i=0; i<=eventTargets.length; i++) {
			eventTargets[i].className = eventTargets[i].className.replace(/ CSSFragTarget/g, "");
		}
	}

	event.target.className += " CSSFragTarget";	
	safari.self.tab.setContextMenuEventUserInfo(event, { 'display': (nodeName !== 'body' && nodeName !== 'head' && nodeName !== 'html' && nodeName !== '#document' && nodeID !== 'CSSFragLinkWrapper' && nodeID !== 'CSSFragLinkContainer' && nodeID !== 'CSSFragLinkInput') });
} document.addEventListener('contextmenu', handleContextMenu, false);

function handleMessage(event) {
	if (event.name === 'generateFragmentLink') {
		window.settings = safari.self.tab.canLoad(event, 'getSettings'); // Why look! It's another hack!
		var eventTarget = document.getElementsByClassName("CSSFragTarget")[0];
		eventTarget.className = eventTarget.className.replace(/ CSSFragTarget/g, "");
		
		var href = window.location.href.split("#")[0].toLowerCase();
		var currentNode = eventTarget;
		var selector = "";
		var selectorBuilt = false;
		
		do {
			var nodeName = currentNode.nodeName.toLowerCase()
			if (nodeName === 'body' || nodeName === 'head' || nodeName === 'html' || nodeName === '#document') { break; }
			
			if (!selectorBuilt) {
				var newSelector = nodeName;
				if (currentNode.getAttribute('id') !== null && currentNode.getAttribute('id') !== '' && singleElementWithID(currentNode.getAttribute('id'))) { newSelector += "#" + currentNode.getAttribute('id'); }
				if (currentNode.getAttribute('class') !== null && currentNode.getAttribute('class') !== '') { newSelector += "." + currentNode.getAttribute('class'); }
				
				var index = nthIndex(currentNode);
				if (index > 1) { newSelector += ":nth-child(" + index + ")"; }
			
				selector = newSelector + ">" + selector;
				if (document.querySelectorAll(selector.substring(0, selector.length - 1)).length == 1) { selectorBuilt = true; }
			}
		} while (currentNode = currentNode.parentNode);
		if (singleElementWithID(eventTarget.id)) {
			if (settings.preferStandardHashes) { URL = href + "#" + eventTarget.id + ""; }
			else { URL = href + "#css(%23" + eventTarget.id + ")"; }
		}
		else { URL = href + "#css(" + encodeURIComponent(selector.substring(0, selector.length - 1)) + ")" }
		
		showURLinWindow(URL);
	}
} safari.self.addEventListener('message', handleMessage, false);

function handleLoadAndHashChange() {
	window.settings = safari.self.tab.canLoad(event, 'getSettings'); // Why look! It's another hack!
	var CSSFragHash = decodeURIComponent(window.location.hash).match(/css\((.+)\)/);
	if (CSSFragHash) { scrollFocusAndHighlight(CSSFragHash[1], true); }
	else if (settings.highlightTarget === 'all' && window.location.hash !== '') { scrollFocusAndHighlight(window.location.hash, false); }
} window.addEventListener('load', handleLoadAndHashChange, false); window.addEventListener('hashchange', handleLoadAndHashChange, false);

function showURLinWindow(URL) {
	if (document.getElementById('CSSFragLinkWrapper') === null) {
		document.body.innerHTML += '<div id="CSSFragLinkWrapper"><div id="CSSFragLinkContainer"><div id="CSSFragLinkPadding"><input id="CSSFragLinkInput" name="CSSFragLinkInput" value="" autofocus></div></div></div>';
		document.getElementById('CSSFragLinkWrapper').addEventListener('click', hideURLinWindow, false);
		document.addEventListener('copy', hideURLinWindow, false);
	}
	document.getElementById('CSSFragLinkInput').value = URL;
	document.getElementById('CSSFragLinkWrapper').style.display = "block";
	setTimeout(function(){document.getElementById('CSSFragLinkWrapper').className = "active";}, 0);
	document.getElementById('CSSFragLinkInput').select();
}

function hideURLinWindow(event) {
	document.getElementById('CSSFragLinkWrapper').className = "";
	setTimeout(function(){document.getElementById('CSSFragLinkWrapper').style.display = "none";}, 600);
}
