export const formDetectionScript = `
  (() => {
    // 1. Check for CAPTCHA
    const hasCaptcha = !!(
      document.querySelector('iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .g-recaptcha, .h-captcha, #cf-turnstile, .turnstile-wrapper') ||
      document.body.innerText.toLowerCase().includes('verify you are human') ||
      document.body.innerText.toLowerCase().includes('security check') ||
      document.body.innerText.toLowerCase().includes('cloudflare ray id')
    );

    // 2. Check for Apply button if form not yet open (Unstop, Wellfound, Greenhouse, Lever)
    let applyButtonSelector = null;
    const isHeaderOrNav = (el) => !!el.closest('header, nav, .navbar, .global-header, .header, [role="navigation"]');

    const buttons = Array.from(document.querySelectorAll('button, a, input[type="button"], [role="button"]'));
    for (const b of buttons) {
      if (isHeaderOrNav(b)) continue;
      if (b.offsetParent === null) continue;

      const txt = (b.innerText || b.value || b.getAttribute('aria-label') || '').toLowerCase().trim();
      const href = (b.getAttribute('href') || '').toLowerCase();
      const classes = (b.className || '').toString().toLowerCase();

      if (
        txt === 'apply' ||
        txt === 'apply now' ||
        txt === 'easy apply' ||
        txt === 'register' ||
        txt === 'register now' ||
        txt === 'apply for this job' ||
        txt === 'submit an application' ||
        txt.includes('apply now') ||
        txt.includes('register now') ||
        txt.includes('apply (free)') ||
        txt.includes('register') ||
        href.includes('/apply') ||
        href.includes('/register') ||
        classes.includes('apply-btn') ||
        classes.includes('register-btn')
      ) {
        if (b.id) applyButtonSelector = '#' + CSS.escape(b.id);
        else if (b.className && typeof b.className === 'string') {
          applyButtonSelector = b.tagName.toLowerCase() + '.' + b.className.split(' ').filter(Boolean).slice(0, 2).join('.');
        } else {
          applyButtonSelector = b.tagName.toLowerCase();
        }
        break;
      }
    }

    // 3. Check for Login Wall or Auth Gate inside modal or main view (Ignore global nav login links)
    const hasPassword = !!document.querySelector('input[type="password"]');
    const modalOrMain = document.querySelector('[role="dialog"], .modal, .auth-modal, .login-modal, main, #app') || document.body;
    const pageText = (modalOrMain ? modalOrMain.innerText : '').toLowerCase();
    
    const hasLoginPrompt = (
      pageText.includes('login to apply') ||
      pageText.includes('sign in to apply') ||
      pageText.includes('please login to continue') ||
      pageText.includes('sign in with google') ||
      pageText.includes('log in with google') ||
      pageText.includes('login with otp') ||
      pageText.includes('enter your mobile number to login') ||
      pageText.includes('enter mobile number') ||
      window.location.pathname.toLowerCase().includes('/login') ||
      window.location.pathname.toLowerCase().includes('/signin')
    );

    const isLogin = (hasPassword || hasLoginPrompt) && !hasCaptcha;

    // 4. Extract Application Form Fields
    const fields = [];
    const elements = document.querySelectorAll('input, textarea, select, [contenteditable="true"]');
    
    elements.forEach((el, index) => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || (el instanceof HTMLInputElement && el.type === 'hidden')) {
        return;
      }
      
      const tag = el.tagName.toLowerCase();
      const type = (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) ? (el.type || 'text') : (tag === 'textarea' ? 'textarea' : 'text');
      
      if (type === 'submit' || type === 'button' || type === 'reset') return;

      const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
      const name = (el.getAttribute('name') || '').toLowerCase();
      const id = (el.id || '').toLowerCase();
      const role = (el.getAttribute('role') || '').toLowerCase();
      const rawText = (el.parentElement ? el.parentElement.innerText : '').toLowerCase();
      const inNav = !!el.closest('header, nav, .navbar, .global-header, .qsb, .search-bar, [role="search"], .filters-bar, .search-filters');

      if (
        role === 'searchbox' ||
        inNav ||
        placeholder.includes('search jobs') ||
        placeholder.includes('search by skills') ||
        placeholder.includes('enter skills / designations') ||
        placeholder.includes('search candidate') ||
        rawText.includes('hide jobs') ||
        rawText.includes('job alert') ||
        rawText.includes('email me jobs') ||
        rawText.includes('save search') ||
        rawText.includes('apply on the company') ||
        id.includes('search') ||
        id.includes('qsb') ||
        name.includes('search')
      ) {
        return;
      }

      let labelText = '';
      if (el.labels && el.labels.length > 0) {
        labelText = Array.from(el.labels).map(l => l.innerText).join(' ').trim();
      } else if (el.id) {
        const labelEl = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
        if (labelEl) labelText = labelEl.innerText.trim();
      }
      
      if (!labelText) {
        labelText = el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('name') || '';
      }

      if (!labelText) {
        const parent = el.closest('div, section, p, fieldset, tr');
        if (parent) {
          const possibleLabel = parent.querySelector('label, span, p, .label, strong');
          if (possibleLabel && possibleLabel !== el) {
            labelText = possibleLabel.innerText.trim().slice(0, 100);
          }
        }
      }

      let selector = '';
      if (el.id) {
        selector = '#' + CSS.escape(el.id);
      } else if (el.name) {
        selector = tag + '[name="' + CSS.escape(el.name) + '"]';
      } else if (el.getAttribute('placeholder')) {
        selector = tag + '[placeholder="' + CSS.escape(el.getAttribute('placeholder')) + '"]';
      } else if (el.getAttribute('aria-label')) {
        selector = tag + '[aria-label="' + CSS.escape(el.getAttribute('aria-label')) + '"]';
      } else {
        selector = tag + ':nth-of-type(' + (index + 1) + ')';
      }

      const required = el.required || el.getAttribute('aria-required') === 'true' || labelText.includes('*');

      fields.push({
        id: el.id || ('field-' + index),
        tag,
        type,
        name: (el.name || el.id || ('field_' + index)),
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
      applyButtonSelector,
      fields,
      pageTitle: document.title,
      currentUrl: window.location.href
    };
  })();
`;
