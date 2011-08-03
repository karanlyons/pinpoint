//
//		PINPOINT
//

function scrollFocusAndHighlight(selector, isCSSSelector, elementIsStatic) {
	//
	// Finds an element in the document via a selector, and optionally scrolls
	// to and highlights it depending on the user's settings. isCSSSelector is
	// true if the selector is a CSS Selector (as opposed to an ID).
	//
	
	if (!elementIsStatic) { // If elementIsStatic is not true, it means they may be currently animated.
		if (!document.getElementById('pinpointAnimationChecks')) {
			var animationChecks = document.createElement('script');
			animationChecks.type = 'text/javascript';
			animationChecks.id = 'pinpointAnimationChecks';
			animationChecks.innerHTML = 'function checkForAnimation(){var a=document.querySelector(decodeURIComponent(window.location.hash).replace(/#css\\((.+)\\)/,"$1"));if(typeof jQuery==="function"){jQuery(document).ready(function(){var b=10;var c=setInterval(function(){var d=(jQuery(a).filter(":animated").length>0);if(d){b=b+1}else{b=b-1}if(b<1){elementIsStatic(c)}},100)})}else{elementIsStatic()}}window.addEventListener("checkForAnimation",checkForAnimation,true);function elementIsStatic(a){window.clearInterval(a);var b=document.createEvent("Event");b.initEvent("elementIsStatic",true,true);document.dispatchEvent(b)};';
			document.head.appendChild(animationChecks);
		}
		
		var event = document.createEvent('Event');
		event.initEvent('checkForAnimation', true, true);
		document.dispatchEvent(event);
		
		return false;
	}
	
	var element = document.querySelector(selector);
	if (element === null) { return false; }
	fixImageDimensionsRelatedToElement(element);
	
	if (getComputedStyle(element).display === 'none') {
		var mouseOverEvent = document.createEvent('MouseEvents');
		mouseOverEvent.initEvent('mouseover', true, false);
		element.dispatchEvent(mouseOverEvent);
		var mouseOut = true;
	}
	
	else { mouseOut = false; }
	
	var boundingRect = element.getBoundingClientRect();
	var bounds = {
		'top': boundingRect.top + document.body.scrollTop,
		'left': boundingRect.left + document.body.scrollLeft,
		'height': boundingRect.height,
		'width': boundingRect.width
	};
	
	if (settings.highlightTarget !== 'none' && (settings.highlightTarget === 'all' || (isCSSSelector && settings.highlightTarget === 'pinpoints'))) {
		if ((document.body.scrollLeft <= boundingRect.left) && (boundingRect.left <= document.body.scrollLeft + window.innerWidth) && (document.body.scrollTop <= boundingRect.top) && (boundingRect.top <= document.body.scrollTop + window.innerHeight) && (document.body.scrollLeft <= boundingRect.left + boundingRect.width) && (boundingRect.left + boundingRect.width <= document.body.scrollLeft + window.innerWidth) && (document.body.scrollTop <= boundingRect.top + boundingRect.height) && (boundingRect.top + boundingRect.height <= document.body.scrollTop + window.innerHeight)) {
			var scroll = {
				'top': document.body.scrollTop,
				'left': document.body.scrollLeft
			};
		}
		
		else {
			var scroll = {
				'top': (bounds.top + (bounds.height / 2) - (window.innerHeight / 2)),
				'left': (bounds.left + (bounds.width / 2) - (window.innerWidth / 2))
			};
		}
		
		var highlightBackground = document.createElement('div');
		highlightBackground.id = 'pinpointHighlightBackground';
		highlightBackground.style.left = bounds.left - 5 + "px !important";
		highlightBackground.style.top = bounds.top - 5 + "px !important";
		
		var highlight = element.cloneNode(true);
		highlight = cloneStyles(element, highlight);
		highlight.id = "pinpointHighlight";
		highlight.className = "";
		
		highlight.style.height += " !important";
		highlight.style.width += " !important";
		
		if (mouseOut = true) {
			var mouseOutEvent = document.createEvent('MouseEvents');
			mouseOutEvent.initEvent('mouseout', true, false);
			element.dispatchEvent(mouseOutEvent);
		}
		
		highlightBackground.appendChild(highlight);
		
		window.scrollTo(scroll.left, scroll.top);
		document.body.appendChild(highlightBackground);
		element.focus();
		
		setTimeout(function() { document.body.removeChild(highlightBackground); }, 1600);
	}
	
	else { window.scrollTo(bounds.left, bounds.top); }
	
	return true;
}


function createPinpoint(event) {
	//
	// Generates pinpoints before sending them to showLinkinWindow().
	//
	
	if (event.name === 'createPinpoint') {
		window.settings = safari.self.tab.canLoad(event, 'getSettings');
		var eventTarget = document.getElementsByClassName("pinpointTarget")[0];
		eventTarget.className = eventTarget.className.replace(/ pinpointTarget/g, "");
		
		var href = settings.currentURL.split("#")[0];
		var currentNode = eventTarget;
		var currentNodeAttribute = "#" + currentNode.getAttribute('id');
		var oldSelector = "";
		var link = "";
		
		if (currentNodeAttribute !== "#" && singleElementWithSelector(currentNodeAttribute)) { // If this element has a unique ID, we're done here.
			if (settings.preferStandardHashes) { link = href + currentNodeAttribute; }
			else { link = href + "#css(" + encodeURIComponent(currentNodeAttribute) + ")"; }
		}
		
		else {
			do {
				var nodeName = currentNode.nodeName.toLowerCase();
				if (nodeName === 'body' || nodeName === 'head' || nodeName === 'html' || nodeName === '#document') { break; }
				var currentNodeAttribute = "";
				
				var selector = { // Ordered by their position in the CSS selector.
					'name': nodeName,
					'href': "",
					'src': "",
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
					'oldSelector': ">" + oldSelector
				};
				
				var attributes = [ // Ordered by uniqueness.
					'href',
					'src',
					'title',
					'type',
					'name',
					'for',
					'value',
					'action',
					'rows',
					'rel'
				];
				
				// ID
				currentNodeAttribute = currentNode.getAttribute('id');
				if (currentNodeAttribute !== null && currentNodeAttribute !== '') {
					selector['id'] = "#" + currentNodeAttribute; // We could fold this into the for loop and do [id='foobar'] instead, but that's...uglier.
					if (firstElementWithSelector(dictionaryToSelector(selector), eventTarget)) { break; }
				}
				
				// Class
				currentNodeAttribute = currentNode.getAttribute('class');
				if (currentNodeAttribute !== null && currentNodeAttribute !== '') {
					currentNodeAttribute = currentNodeAttribute.split(" ");
					
					for (var CSSClass in currentNodeAttribute) { // We add each class one by one and check the selector.
						selector['class'] += "." + currentNodeAttribute[CSSClass];
						if (firstElementWithSelector(dictionaryToSelector(selector), eventTarget)) { break; }
					}
					if (firstElementWithSelector(dictionaryToSelector(selector), eventTarget)) { break; }
				}
				
				// All other attributes
				for (var attribute in attributes) {
					currentNodeAttribute = currentNode.getAttribute(attributes[attribute]);
					if (currentNodeAttribute !== null) {
						selector[attributes[attribute]] = "[" + attributes[attribute] + "='" + currentNodeAttribute.replace(/('")/g, "\\$1") + "']";
						if (firstElementWithSelector(dictionaryToSelector(selector), eventTarget)) { break; }
					}
				}
				
				if (firstElementWithSelector(dictionaryToSelector(selector), eventTarget)) { break; }
				
				// :nth-child (We don't break on uniqueness here, because :nth-child is really volatile, and a last resort.)
				var currentNodePosition = nthIndex(currentNode);
				if (currentNodePosition > 1) {
					selector.nthChild = ":nth-child(" + currentNodePosition + ")";
				}
				
				oldSelector = dictionaryToSelector(selector);
			} while (currentNode = currentNode.parentNode);
			
			link = href + "#css(" + encodeURIComponent(dictionaryToSelector(selector)) + ")";
		}
		
		if (settings.linkShorteningService !== 'none') { link = shortenLink(link, settings.linkShorteningService, settings.linkShorteningUsername, settings.linkShorteningAPIKey); }
		
		showLinkinWindow(link);
	}
	
	return true;
} safari.self.addEventListener('message', createPinpoint, false);


function shortenLink(link, service, username, APIKey) {
	//
	// Returns a shortened link, or the original long link if there is an error.
	//
	
	var services = {
		'bitly': {
			'url': 'http://api.bitly.com/v3/shorten?format=json&login=' + username + '&apiKey=' + APIKey + '&longURL=',
			'key': 'data.url'
		},
		'isgd': {
			'url': 'http://is.gd/create.php?format=json&url=',
			'key': 'shorturl'
		}
	}
	
	if (service in services) {
		var request = new XMLHttpRequest();
		var response = {};
		
		request.open('GET', services[service].url + encodeURIComponent(link), false);
		request.send();
		
		if (request.readyState === 4 && request.status === 200) {
			key = services[service].key.split('.');
			response = JSON.parse(request.responseText);
			
			for (var i = 0, length = key.length; i < length; i++) { response = response[key[i]]; }
			
			if (response !== undefined) { return response; }
		}
	}
	
	return link;
}


function showLinkinWindow(link) {
	//
	// Shows the link overlay.
	//
	
	if (document.getElementById('pinpointLinkWrapper') === null) { // Check to see if the overlay elements are already in the page.
		linkWrapper = document.createElement('div');
		linkWrapper.id = "pinpointLinkWrapper";
		linkWrapper.className = "hidden";
		linkWrapper.addEventListener('click', hideLinkinWindow, false);
		linkWrapper.innerHTML = '<div id="pinpointLinkContainer"><div id="pinpointLinkPadding"><input id="pinpointLinkInput" name="pinpointLinkInput" value="" spellcheck="false" autofocus></div></div></div>';
		document.body.appendChild(linkWrapper);
		
		document.getElementById('pinpointLinkInput').addEventListener('keyup', function(event){ event.target.value = link; event.target.select(); }, false);
		document.addEventListener('copy', hideLinkinWindow, false);
		document.addEventListener('cut', hideLinkinWindow, false);
	}
	
	linkInput = document.getElementById('pinpointLinkInput');
	linkInput.value = link;
	
	linkWrapper = document.getElementById('pinpointLinkWrapper');
	linkWrapper.className = "";
	setTimeout(function() { document.getElementById('pinpointLinkWrapper').className = "active"; }, 0);
	linkInput.select();
	
	return true;
}


function hideLinkinWindow(event) {
	//
	// Hides the link overlay when the user cuts or copies the link, or clicks
	// outside of the main overlay.
	//
	
	if (event.type === 'copy' || event.type === 'cut' || event.target.getAttribute('id') === 'pinpointLinkWrapper') {
		linkWrapper = document.getElementById('pinpointLinkWrapper');
		linkWrapper.className = "";
		
		setTimeout(function() { linkWrapper.className = "hidden"; }, 600); }
	
	return true;
}




//
//		HELPER FUNCTIONS
//

function dictionaryToSelector(dictionary) {
	//
	// Returns a concatenated string of a dictionary's values, removing the last
	// character if it's ">".
	//
	
	var string = "";
	for (var key in dictionary) { string += dictionary[key]; }
	
	if (string[string.length - 1] === ">") { return string.substring(0, string.length - 1); }
	else { return string; }
}


function singleElementWithSelector(selector) {
	//
	// Returns true if the selector has only one corresponding element.
	//
	
	return (document.querySelectorAll(selector).length === 1);
}


function firstElementWithSelector(selector, element) {
	//
	// Returns true if the first element returned by the selector is the same as
	// the given element.
	//
	
	return (document.querySelector(selector) === element);
}


function nthIndex(element) {
	//
	// Returns an integer representing the element's DOM position amongst its
	// siblings.
	//
	
	var nodes = element.parentNode.childNodes
	var count = 1;
	
	for (node in nodes) {
		if (nodes[node] === element) { break; }
		if (nodes[node].nodeType === 1) { count++; }
	}
	
	return count;
}


function fixImageDimensionsRelatedToElement(element) {
	//
	// Walks up the tree from an element repairing any img nodes' height and
	// width attributes if they aren't properly set in the DOM.
	//
	
	var currentNode = element.parentNode;
	var imageDimensions;
	
	do {
		var children = currentNode.childNodes;
		var i = 0;
		
		while(child = children.item(i++)) {
			var childComputedStyle = getComputedStyle(child);
			if (child.nodeType !== undefined && child.nodeName.toLowerCase() === 'img' && parseInt(childComputedStyle.height) === 0 && parseInt(childComputedStyle.width) === 0) {
					imageDimensions = new Image();
					imageDimensions.src = children[child].src;
					
					child.style.height = imageDimensions.height + "px !important";
					child.style.width = imageDimensions.width + "px !important";
			}
		}
	} while (currentNode = currentNode.parentNode);
	
	return true;
}


function cloneStyles(element, clone) {
	//
	// Returns a clone of the given element, including the same styles for it
	// and its children.
	//
	if (element.nodeType === 1) {
		var children = element.childNodes;
		clone.style.cssText = getComputedStyle(element).cssText;
		
		for (var i = 0; i < children.length; i++) {
			clone.childNodes[i] = cloneStyles(children[i], clone.childNodes[i]);
		}
	}
	
	return clone;
}




//
//		HANDLERS
//

function handleElementIsStatic(event) {
	//
	// Called by the animation check functions, hands off to
	// handleLoadAndHashChange() when there is a lull in element animation.
	//
	handleLoadAndHashChange(event, true);
	
	return true;
} window.addEventListener('elementIsStatic', handleElementIsStatic, false);


function handleLoadAndHashChange(event, elementIsStatic) {
	//
	// Checks for a pinpoint (or any hash, if the user wants highlighting) on
	// page loads and hash changes, and calls scrollFocusAndHighlight() if it
	// finds one.
	//
	
	window.settings = safari.self.tab.canLoad(event, 'getSettings');
	var pinpoint = decodeURIComponent(window.location.hash).match(/css\((.+)\)/);
	
	if (pinpoint) { scrollFocusAndHighlight(pinpoint[1], true, elementIsStatic); }
	else if (settings.highlightTarget === 'all' && window.location.hash !== '') { scrollFocusAndHighlight(window.location.hash, false, elementIsStatic); }
	
	return true;
} window.addEventListener('load', handleLoadAndHashChange, false); window.addEventListener('hashchange', handleLoadAndHashChange, false);


function handleContextMenu(event) {
	//
	// Attaches the "pinpointTarget" class to the event target, and if it is a
	// linkable element, sets userInfo.display to true.
	//
	
	var nodeName = event.target.nodeName.toLowerCase();
	var nodeID = event.target.getAttribute('id');
	
	var eventTargets = document.getElementsByClassName("pinpointTarget"); // Safari doesn't allow passing elements through setContextMenuEventUserInfo.
	for (var i = 0, length = eventTargets.length; i < length; i++) {
		eventTargets[i].className = eventTargets[i].className.replace(/ pinpointTarget/g, "");
	}
	event.target.className += " pinpointTarget";
	
	safari.self.tab.setContextMenuEventUserInfo(event, { 'display': (nodeName !== 'body' && nodeName !== 'head' && nodeName !== 'html' && nodeName !== '#document' && (nodeID === null || !nodeID.match(/pinpoint/g))) });
	
	return true;
} document.addEventListener('contextmenu', handleContextMenu, false);
