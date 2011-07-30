//
//		ANIMATION CHECKS
//

function checkForAnimation() {
	if (typeof jQuery === 'function') { // jQuery has no check for whether animations are running, but does have an :animated pseudo selector.
		var animating = 1;
		var animationCheck = setInterval(function() {
			var animatedElements = $('*:animated').length;
			
			if (animatedElements < 1) { animating = animating - 1; }
			else { animating = animating + 1; }
			
			if (animating < 1) { elementsAreStatic(animationCheck); }
		}, 100);
	}
	
	else { elementsAreStatic(); }
} window.addEventListener('checkForAnimation', checkForAnimation, true);




//
//		HELPER FUNCTIONS
//

function elementsAreStatic(animationCheck) {
	//
	// Calls end.js' elementsAreStatic().
	//
	
	window.clearInterval(animationCheck);
	
	var event = document.createEvent('Event');
	event.initEvent('elementsAreStatic', true, true);
	document.dispatchEvent(event);
}
