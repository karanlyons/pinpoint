// HELPER FUNCTIONS

function dictionaryToSelector(dictionary) {
	//
	// Returns a dictionary's values as a concatenated string, removing the last character if it's ">".
	//
	var string = "";
	for (var key in dictionary) { string += dictionary[key]; }
	
	if (string[string.length - 1] === ">") { return string.substring(0, string.length - 1); }
	return string;
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

function singleElementWithSelector(selector) {
	//
	// Returns true if the selector has only one corresponding element.
	//
	
	return (document.querySelectorAll(selector).length === 1);
}

function firstElementWithSelector(selector, element) {
	//
	// Returns true if the first element returned by the selector is the same as the given element.
	//
	return (document.querySelector(selector) === element);
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
		if (rgba.length < 3) { return false; }
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
	var bounds = element.getBoundingClientRect();
	
	window.scrollTo(bounds.x, bounds.y);
	element.focus();
	if (settings.highlightTarget !== 'none' && (settings.highlightTarget === 'all' || (isFragHash && settings.highlightTarget === 'frag'))) {
		highlightBackground(element, (colorToRGBADictionary(settings.highlightColor) || {'r': 255, 'g': 255, 'b': 156, 'a': 1}), 2000);
	}
}


// CSSFrag

var URL = "";

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
		var currentNodeAttribute = currentNode.getAttribute('id');
		var oldSelector = "";
		
		if (singleElementWithSelector(currentNodeAttribute)) { // If this element has a unique ID, we're done here.
			if (settings.preferStandardHashes) { URL = href + "#" + currentNodeAttribute; }
			else { URL = href + "#css(%23" + currentNodeAttribute + ")"; }
		}
		else {
			do {
				var nodeName = currentNode.nodeName.toLowerCase()
				if (nodeName === 'body' || nodeName === 'head' || nodeName === 'html' || nodeName === '#document') { break; }
				var currentNodeAttribute = "";
				
				var selector = { // Ordered by their position in the CSS selector.
					'name': nodeName,
					'href': "",
					'title': "",
					'type': "",
					'rel': "",
					'action': "",
					'for': "",
					'value': "",
					'rows': "",
					'id': "",
					'class': "",
					'nthChild': "",
					'oldSelector': ">" + oldSelector,
				}
				
				var attributes = [ // Ordered by uniqueness. We could do a uniqueness check on the nodeName itself, but that seems *extremely* volatile.
					'href',
					'src',
					'title',
					'type',
					'name',
					'for',
					'value',
					'action',
					'rows',
					'rel',
				]
				
				// ID
				currentNodeAttribute = currentNode.getAttribute('id');
				if (currentNodeAttribute !== null && currentNodeAttribute !== '') {
					selector.id = "#" + currentNodeAttribute; // We could fold this into the for loop and do [id='foobar'] instead, but that's...uglier.
					if (firstElementWithSelector(dictionaryToSelector(selector), eventTarget)) { break; }
				}
				
				// Class
				currentNodeAttribute = currentNode.getAttribute('class');
				if (currentNodeAttribute !== null && currentNodeAttribute !== '') {
					selector.class = "." + currentNodeAttribute;
					if (firstElementWithSelector(dictionaryToSelector(selector), eventTarget)) { break; }
				}
				
				// All other attributes
				for (var i in attributes) {
					currentNodeAttribute = currentNode.getAttribute(attributes[i]);
					if (currentNodeAttribute !== null) {
						selector[attributes[i]] = "[" + attributes[i] + "='" + currentNodeAttribute + "']";
						if (firstElementWithSelector(dictionaryToSelector(selector), eventTarget)) { break; }
					}
				}
				
				if (firstElementWithSelector(dictionaryToSelector(selector), eventTarget)) { break; }
				
				// :nth-child (We don't break on uniqueness here, because :nth-child is really volatile, and a last resort.)
				var currentNodePosition = nthIndex(currentNode);
				if (currentNodePosition > 1) { // To my knowledge, we can't fold this into the for loop as we're running a different check.
					selector.nthChild = ":nth-child(" + currentNodePosition + ")";
				}
				
				oldSelector = dictionaryToSelector(selector);
			} while (currentNode = currentNode.parentNode);
			
			URL = href + "#css(" + encodeURIComponent(dictionaryToSelector(selector)) + ")"
		}
		
		showURLinWindow();
	}
} safari.self.addEventListener('message', handleMessage, false);

function handleLoadAndHashChange() {
	window.settings = safari.self.tab.canLoad(event, 'getSettings'); // Why look! It's another hack!
	var CSSFragHash = decodeURIComponent(window.location.hash).match(/css\((.+)\)/);
	if (CSSFragHash) { scrollFocusAndHighlight(CSSFragHash[1], true); }
	else if (settings.highlightTarget === 'all' && window.location.hash !== '') { scrollFocusAndHighlight(window.location.hash, false); }
} window.addEventListener('load', handleLoadAndHashChange, false); window.addEventListener('hashchange', handleLoadAndHashChange, false);

function showURLinWindow() {
	if (document.getElementById('CSSFragLinkWrapper') === null) {
		document.body.innerHTML += '<link rel="stylesheet" type="text/css" href="' + safari.extension.baseURI + 'style.css" /><div id="CSSFragLinkWrapper"><div id="CSSFragLinkContainer"><div id="CSSFragLinkPadding"><input id="CSSFragLinkInput" name="CSSFragLinkInput" value="" autofocus></div></div></div>';
		
		document.getElementById('CSSFragLinkInput').addEventListener('keyup', function(event){ event.target.value = URL; event.target.select(); }, false);
		
		document.getElementById('CSSFragLinkWrapper').addEventListener('click', hideURLinWindow, false);
		document.addEventListener('copy', hideURLinWindow, false);
		document.addEventListener('cut', hideURLinWindow, false);
	}
	document.getElementById('CSSFragLinkInput').value = URL;
	
	document.getElementById('CSSFragLinkWrapper').style.display = "block";
	document.getElementById('CSSFragLinkWrapper').className = "";
	setTimeout(function(){document.getElementById('CSSFragLinkWrapper').className = "active";}, 0);
	document.getElementById('CSSFragLinkInput').select();
}

function hideURLinWindow(event) {
	if (event.type === 'copy' || event.type === 'cut' || event.target.getAttribute('id') === 'CSSFragLinkWrapper') {
		document.getElementById('CSSFragLinkWrapper').className = "";
		setTimeout(function(){
			document.getElementById('CSSFragLinkWrapper').style.display = "none";
			document.getElementById('CSSFragLinkWrapper').className = "hidden";
		}, 600);
	}
}
