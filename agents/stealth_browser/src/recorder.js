(function() {
    // -------------------------------------------------------------------------
    // Intelligent CSS Selector Generator
    // Priority: ID > data-testid > aria-label > Unique Class > Hierarchical
    // -------------------------------------------------------------------------
    function getOptimalSelector(el) {
        if (!(el instanceof Element)) return;
        
        // 1. Check ID (Highest Priority)
        if (el.id) {
            // Ensure ID is valid CSS and doesn't look auto-generated (e.g., containing long numbers)
            if (!/\d{5,}/.test(el.id)) { 
                return '#' + el.id; 
            }
        }

        // 2. Check common test attributes
        const testAttrs = ['data-testid', 'data-test-id', 'data-qa', 'name', 'aria-label'];
        for (let attr of testAttrs) {
            if (el.hasAttribute(attr)) {
                let val = el.getAttribute(attr);
                return `[${attr}="${val}"]`;
            }
        }

        // 3. Check for unique classes (simplified)
        // Skip classes that look dynamic (e.g., tailwind hash classes)
        if (el.className && typeof el.className === 'string') {
            const classes = el.className.split(' ').filter(c => c.length > 2 && !/[:/]/.test(c));
            if (classes.length > 0) {
                 // Try the first class combined with tag
                 let potential = el.tagName.toLowerCase() + '.' + classes[0];
                 // Verify uniqueness
                 if (document.querySelectorAll(potential).length === 1) {
                     return potential;
                 }
            }
        }

        // 4. Fallback to hierarchical path (Improved)
        var path = [];
        while (el.nodeType === Node.ELEMENT_NODE) {
            var selector = el.nodeName.toLowerCase();
            if (el.id && !/\d{5,}/.test(el.id)) {
                selector = '#' + el.id;
                path.unshift(selector);
                break; // Stop at nearest ID
            } else {
                var sib = el, nth = 1;
                while (sib = sib.previousElementSibling) {
                    if (sib.nodeName.toLowerCase() == selector)
                       nth++;
                }
                if (nth != 1)
                    selector += ":nth-of-type("+nth+")";
            }
            path.unshift(selector);
            el = el.parentNode;
        }
        return path.join(" > ");
    }

    // Notify Python
    function recordAction(data) {
        console.log('__RECORDER_EVENT__:' + JSON.stringify(data));
    }

    // Debounce / Throttle preventer
    let lastEvent = 0;

    document.addEventListener('click', function(e) {
        const now = Date.now();
        if (now - lastEvent < 50) return; // Ignore double fires
        lastEvent = now;

        var target = e.target;
        // If clicking an icon inside a button, bubble up to the button
        if (target.tagName === 'SVG' || target.tagName === 'PATH' || target.tagName === 'SPAN') {
            const btn = target.closest('button, a, div[role="button"]');
            if (btn) target = btn;
        }

        var selector = getOptimalSelector(target);
        
        // Ignore input clicks (handled by change)
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        
        recordAction({
            action: 'click',
            selector: selector,
            timestamp: now
        });
    }, true);

    document.addEventListener('change', function(e) {
        var target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
             var selector = getOptimalSelector(target);
             recordAction({
                action: 'type',
                selector: selector,
                text: target.value,
                timestamp: Date.now()
             });
        }
    }, true);
    
    // Add recorder active flag
    window.__STEALTH_RECORDER_ACTIVE__ = true;
    console.log("Stealth Recorder v2.0 injected.");
})();