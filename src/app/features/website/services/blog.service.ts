import { Injectable, signal } from '@angular/core';
import { BLOG_POSTS_RAW, BlogPostRaw } from './blog-registry';
import { BlogPost } from '../marketing.config';

@Injectable({ providedIn: 'root' })
export class BlogService {
  private readonly _posts = signal<BlogPost[]>(
    BLOG_POSTS_RAW
      .map((raw: BlogPostRaw): BlogPost => ({
        slug: raw.slug,
        title: raw.title,
        description: raw.description,
        date: raw.date,
        author: raw.author,
        category: raw.category,
        tags: raw.tags,
        image: raw.image,
        readTime: raw.readTime,
        featured: raw.featured,
        body: raw.body,
      }))
      .sort((a, b) => b.date.localeCompare(a.date)),
  );

  readonly posts = this._posts.asReadonly();

  getAllPosts(): BlogPost[] {
    return this._posts();
  }

  getPostBySlug(slug: string): BlogPost | null {
    return this._posts().find(p => p.slug === slug) ?? null;
  }

  getPostsByCategory(category: string): BlogPost[] {
    return this._posts().filter(p => p.category === category);
  }

  getFeaturedPosts(): BlogPost[] {
    return this._posts().filter(p => p.featured);
  }

  getRelatedPosts(slug: string, max: number = 3): BlogPost[] {
    const post = this.getPostBySlug(slug);
    if (!post) return [];
    return this._posts()
      .filter(p => p.slug !== slug && p.category === post.category)
      .slice(0, max);
  }
}
