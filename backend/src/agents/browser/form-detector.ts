export const formDetectionScript = `
  (() => {
    // 1. Check for CAPTCHA
    const hasCaptcha = !!(
      document.querySelector('iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .g-recaptcha, .h-captcha, #cf-turnstile') ||
      document.body.innerText.toLowerCase().includes('verify you are human') ||
      document.body.innerText.toLowerCase().includes('security check')
    );

    // 2. Check for Login wall
    const hasPassword = !!document.querySelector('input[type="password"]');
    const isLoginPath = window.location.pathname.toLowerCase().includes('login') || window.location.pathname.toLowerCase().includes('signin');
    const hasLoginHeading = !!Array.from(document.querySelectorAll('h1, h2, h3, button')).some(el => {
      const t = (el.innerText || '').toLowerCase();
      return (t.includes('log in') || t.includes('sign in') || t.includes('continue with google')) && !t.includes('apply');
    });
    const isLogin = hasPassword || (isLoginPath && hasLoginHeading);

    // 3. Extract Form Fields
    const fields = [];
    const elements = document.querySelectorAll('input, textarea, select, [contenteditable="true"]');
    
    elements.forEach((el, index) => {
      // Basic visibility check
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || (el instanceof HTMLInputElement && el.type === 'hidden')) {
        return;
      }
      
      const tag = el.tagName.toLowerCase();
      const type = (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) ? (el.type || 'text') : (tag === 'textarea' ? 'textarea' : 'text');
      
      // Skip submit/button inputs from fields list
      if (type === 'submit' || type === 'button' || type === 'reset') return;

      // Find label
      let labelText = '';
      if (el.labels && el.labels.length > 0) {
        labelText = Array.from(el.labels).map(l => l.innerText).join(' ').trim();
      } else if (el.id) {
        const labelEl = document.querySelector(\`label[for="\${el.id}"]\`);
        if (labelEl) labelText = labelEl.innerText.trim();
      }
      
      if (!labelText) {
        // Look at aria-label or placeholder
        labelText = el.getAttribute('aria-label') || el.getAttribute('placeholder') || '';
      }

      if (!labelText) {
        // Look at previous sibling or parent container heading
        const parent = el.closest('div, section, p, fieldset');
        if (parent) {
          const possibleLabel = parent.querySelector('label, span, p, .label');
          if (possibleLabel && possibleLabel !== el) {
            labelText = possibleLabel.innerText.trim().slice(0, 100);
          }
        }
      }

      // Generate a solid CSS selector
      let selector = '';
      if (el.id) {
        selector = \`#\${CSS.escape(el.id)}\`;
      } else if (el.name) {
        selector = \`\${tag}[name="\${CSS.escape(el.name)}"]\`;
      } else if (el.getAttribute('placeholder')) {
        selector = \`\${tag}[placeholder="\${CSS.escape(el.getAttribute('placeholder'))}"]\`;
      } else if (el.getAttribute('aria-label')) {
        selector = \`\${tag}[aria-label="\${CSS.escape(el.getAttribute('aria-label'))}"]\`;
      } else {
        selector = \`\${tag}:nth-of-type(\${index + 1})\`;
      }

      const required = el.required || el.getAttribute('aria-required') === 'true' || labelText.includes('*');

      fields.push({
        id: el.id || \`field-\${index}\`,
        tag,
        type,
        name: (el.name || el.id || \`field_\${index}\`),
        placeholder: el.getAttribute('placeholder') || '',
        ariaLabel: el.getAttribute('aria-label') || '',
        labelText: labelText.replace(/\\*$/, '').trim(),
        required: !!required,
        selector,
        currentValue: (el.value || el.innerText || '')
      });
    });

    return {
      hasCaptcha,
      isLogin,
      fields,
      pageTitle: document.title,
      currentUrl: window.location.href
    };
  })();
`;
