let dashboardLanguage='pt-br', translationObserver=null;

const EN = (typeof window !== 'undefined' && window.ARK_I18N_EN) || {};
const ES = (typeof window !== 'undefined' && window.ARK_I18N_ES) || {};

function loadDashboardLanguage(lang) {
	if (!lang || lang === 'pt-br') return Promise.resolve();
	if (lang === 'en' && window.ARK_I18N_EN && Object.keys(window.ARK_I18N_EN).length > 0) {
		Object.assign(EN, window.ARK_I18N_EN);
		return Promise.resolve();
	}
	if (lang === 'es' && window.ARK_I18N_ES && Object.keys(window.ARK_I18N_ES).length > 0) {
		Object.assign(ES, window.ARK_I18N_ES);
		return Promise.resolve();
	}
	const targetLang = (lang === 'es' ? 'es' : 'en');
	return new Promise(function(resolve) {
		if (typeof document === 'undefined') return resolve();
		const s = document.createElement('script');
		s.type = 'text/javascript';
		const ver = (typeof ARK_BUILD_VERSION !== 'undefined' ? ARK_BUILD_VERSION : (window.ARK_BUILD_VERSION || '1.5.6'));
		s.src = L.resource('view/equipe-dashboard/i18n.' + targetLang + '.js') + '?v=' + ver;
		s.onload = function() {
			if (targetLang === 'en' && window.ARK_I18N_EN) Object.assign(EN, window.ARK_I18N_EN);
			if (targetLang === 'es' && window.ARK_I18N_ES) Object.assign(ES, window.ARK_I18N_ES);
			if (typeof translateTree === 'function' && document.body) translateTree(document.body);
			resolve();
		};
		s.onerror = function() {
			console.warn('[ARK Router] Falha ao carregar i18n.' + targetLang + '.js, continuando com fallback.');
			resolve();
		};
		document.head.appendChild(s);
	});
}

if (typeof window !== 'undefined') {
	window.loadDashboardLanguage = loadDashboardLanguage;
}

function _t(text){
	return translateText(text);
}
