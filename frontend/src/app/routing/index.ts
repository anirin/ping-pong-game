import { ArticlesPage } from '../../pages/articles/ui/ArticlesPage';

export function mountRouter(el: HTMLElement) {
  function render() {
    el.innerHTML = '';
    const route = location.hash.replace(/^#/, '') || '/';
    switch (route) {
      case '/':
      default:
        el.appendChild(ArticlesPage());
    }
  }
  window.addEventListener('hashchange', render);
  render();
}
