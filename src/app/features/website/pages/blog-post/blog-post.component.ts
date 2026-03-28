import { Component, ChangeDetectionStrategy, inject, computed, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MarketingSectionComponent } from '../../shared/marketing-section.component';
import { FinalCtaComponent } from '../../shared/final-cta.component';
import { BlogService } from '../../services/blog.service';
import { marked } from 'marked';

@Component({
  selector: 'os-blog-post',
  standalone: true,
  imports: [RouterLink, DatePipe, MarketingSectionComponent, FinalCtaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './blog-post.component.html',
  styleUrl: './blog-post.component.scss',
})
export class BlogPostComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly blogService = inject(BlogService);

  readonly slug = signal('');

  readonly post = computed(() => this.blogService.getPostBySlug(this.slug()));

  readonly bodyHtml = computed(() => {
    const p = this.post();
    if (!p) return '';
    return marked.parse(p.body) as string;
  });

  readonly relatedPosts = computed(() => this.blogService.getRelatedPosts(this.slug(), 3));

  ngOnInit(): void {
    this.slug.set(this.route.snapshot.paramMap.get('slug') ?? '');
  }
}
