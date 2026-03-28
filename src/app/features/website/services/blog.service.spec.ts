import { describe, it, expect, beforeEach } from 'vitest';
import { BlogService } from './blog.service';

describe('BlogService', () => {
  let service: BlogService;

  beforeEach(() => {
    service = new BlogService();
  });

  describe('getAllPosts', () => {
    it('returns all posts', () => {
      const posts = service.getAllPosts();
      expect(posts.length).toBeGreaterThanOrEqual(3);
    });

    it('returns posts sorted by date descending', () => {
      const posts = service.getAllPosts();
      for (let i = 1; i < posts.length; i++) {
        expect(posts[i - 1].date >= posts[i].date).toBe(true);
      }
    });
  });

  describe('getPostBySlug', () => {
    it('returns the correct post for a valid slug', () => {
      const post = service.getPostBySlug('restaurant-pos-comparison-2026');
      expect(post).not.toBeNull();
      expect(post!.title).toBe('Restaurant POS Systems in 2026: What Actually Matters');
    });

    it('returns null for an unknown slug', () => {
      const post = service.getPostBySlug('nonexistent-slug');
      expect(post).toBeNull();
    });
  });

  describe('getPostsByCategory', () => {
    it('filters posts by category', () => {
      const posts = service.getPostsByCategory('Restaurant Tech');
      expect(posts.length).toBeGreaterThanOrEqual(2);
      for (const post of posts) {
        expect(post.category).toBe('Restaurant Tech');
      }
    });

    it('returns empty array for unknown category', () => {
      const posts = service.getPostsByCategory('Nonexistent Category');
      expect(posts.length).toBe(0);
    });
  });

  describe('getFeaturedPosts', () => {
    it('returns only featured posts', () => {
      const posts = service.getFeaturedPosts();
      expect(posts.length).toBeGreaterThanOrEqual(1);
      for (const post of posts) {
        expect(post.featured).toBe(true);
      }
    });
  });

  describe('getRelatedPosts', () => {
    it('returns posts in the same category excluding the current post', () => {
      const related = service.getRelatedPosts('restaurant-pos-comparison-2026');
      for (const post of related) {
        expect(post.slug).not.toBe('restaurant-pos-comparison-2026');
        expect(post.category).toBe('Restaurant Tech');
      }
    });

    it('returns at most max posts', () => {
      const related = service.getRelatedPosts('restaurant-pos-comparison-2026', 1);
      expect(related.length).toBeLessThanOrEqual(1);
    });

    it('returns empty array for unknown slug', () => {
      const related = service.getRelatedPosts('nonexistent-slug');
      expect(related.length).toBe(0);
    });
  });

  describe('posts signal', () => {
    it('exposes a readonly signal', () => {
      const posts = service.posts();
      expect(Array.isArray(posts)).toBe(true);
      expect(posts.length).toBeGreaterThanOrEqual(3);
    });
  });
});
