# Machine Yearning Chat

A GitHub Pages template for rendering Markdown conversation files as a chat interface.

## Features

- Automatically lists all conversations organized by date
- Renders Markdown files as a chat interface
- Supports code syntax highlighting
- Responsive design with dark mode support
- Works with GitHub Pages' Jekyll integration

## Setup

1. Enable GitHub Pages for your repository
   - Go to Settings > Pages
   - Select the branch you want to deploy from (usually `main` or `master`)
   - Save the settings

2. Your site will be available at `https://[your-username].github.io/[repository-name]/`

## Adding New Conversations

1. Create a directory with a date format: `YYYY.MM.DD`
2. Add your Markdown conversation files inside that directory
3. Format your conversations with these HTML comments:

```markdown
<!-- USER -->
User's message goes here

<!-- ASSISTANT -->
Assistant's response goes here
```

4. The files will be automatically listed on the homepage

## Customization

- Modify `chat-style.css` to change the appearance
- Edit `_config.yml` to change site settings
- Adjust the Jekyll templates in `index.html` and `chat-viewer.html`

## Local Development

1. Install Jekyll and Bundler:
   ```
   gem install jekyll bundler
   ```

2. Create a `Gemfile` with:
   ```
   source 'https://rubygems.org'
   gem 'github-pages', group: :jekyll_plugins
   ```

3. Run `bundle install`

4. Start the local server:
   ```
   bundle exec jekyll serve
   ```

5. View your site at `http://localhost:4000`

## License

MIT  