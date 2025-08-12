import { fetchArticles } from '../../../entities/article/api/articleApi';
import { ArticleCreateForm } from '../../../features/article-create/ui/ArticleCreateForm';
import { DeleteButton } from '../../../features/article-delete/ui/DeleteButton';

export function ArticlesPage() {
  const page = document.createElement('div');
  page.className = 'space-y-6';

  const title = document.createElement('h1');
  title.className = 'text-2xl font-bold';
  title.textContent = '記事';

  const list = document.createElement('div');

  async function renderList() {
    list.innerHTML = '';
    const articles = await fetchArticles();
    if (!articles.length) {
      const p = document.createElement('p');
      p.className = 'p-4 text-gray-500';
      p.textContent = '記事がありません';
      list.appendChild(p);
      return;
    }
    for (const a of articles) {
      const li = document.createElement('div');
      li.className = 'border rounded-2xl p-4 bg-white space-y-2';

      const head = document.createElement('div');
      head.className = 'flex items-start justify-between';

      const left = document.createElement('div');
      const h3 = document.createElement('h3');
      h3.className = 'text-lg font-semibold';
      h3.textContent = a.title;
      const time = document.createElement('p');
      time.className = 'text-sm text-gray-600';
      time.textContent = new Date(a.createdAt).toLocaleString();
      left.append(h3, time);

      const del = DeleteButton(a.id, renderList);
      head.append(left, del);

      const body = document.createElement('p');
      body.textContent = a.body;

      li.append(head, body);
      list.appendChild(li);
    }
  }

  const form = ArticleCreateForm(renderList);

  page.append(title, form, list);
  renderList();
  return page;
}
