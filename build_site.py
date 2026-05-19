import os
import markdown
import glob
import json

def build_site():
    # Setup HTML template styled like Shadcn UI
    html_template = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI System Design Guide</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Inter', sans-serif; }
            /* Shadcn-like Markdown Typography */
            .prose { max-width: 800px; margin: 0 auto; color: #0f172a; padding-bottom: 4rem; }
            .prose h1 { font-size: 2.25rem; font-weight: 800; letter-spacing: -0.025em; margin-bottom: 1.5rem; margin-top: 1rem; line-height: 1.2; }
            .prose h2 { font-size: 1.5rem; font-weight: 600; letter-spacing: -0.025em; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; margin-top: 2rem; margin-bottom: 1rem; }
            .prose h3 { font-size: 1.25rem; font-weight: 600; letter-spacing: -0.025em; margin-top: 1.5rem; margin-bottom: 1rem; }
            .prose p { margin-bottom: 1.25rem; line-height: 1.75; color: #334155; }
            .prose a { color: #0f172a; text-decoration: underline; text-underline-offset: 4px; font-weight: 500; }
            .prose ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1.25rem; color: #334155; }
            .prose ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1.25rem; color: #334155; }
            .prose li { margin-bottom: 0.5rem; }
            .prose li::marker { color: #64748b; }
            .prose code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; background-color: #f1f5f9; padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-size: 0.875em; color: #0f172a; font-weight: 500; border: 1px solid #e2e8f0; }
            .prose pre { background-color: #0f172a; padding: 1.25rem; border-radius: 0.5rem; overflow-x: auto; margin-bottom: 1.5rem; }
            .prose pre code { background-color: transparent; color: #e2e8f0; padding: 0; font-weight: 400; border: none; }
            .prose blockquote { border-left: 4px solid #e2e8f0; padding-left: 1rem; font-style: italic; color: #64748b; margin-bottom: 1.25rem; }
            .prose table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; text-align: left; }
            .prose th { border-bottom: 2px solid #e2e8f0; padding: 0.75rem 1rem; font-weight: 600; color: #0f172a; }
            .prose td { border-bottom: 1px solid #e2e8f0; padding: 0.75rem 1rem; color: #334155; }
            
            /* Sidebar transitions */
            .folder-content { overflow: hidden; }
            
            /* Button styles */
            .sidebar-item { border-radius: 0.375rem; transition: background-color 0.15s; }
            .sidebar-item:hover { background-color: #f1f5f9; color: #0f172a; }
            .sidebar-item.active { background-color: #f1f5f9; color: #0f172a; font-weight: 500; }
            
            /* Chevron rotation */
            .chevron { transition: transform 0.2s; }
            .folder-button[aria-expanded="true"] .chevron { transform: rotate(90deg); }
        </style>
    </head>
    <body class="bg-white flex h-screen overflow-hidden text-slate-900">
        
        <!-- Sidebar -->
        <div class="w-80 flex-shrink-0 border-r border-slate-200 bg-[#f8fafc]/50 flex flex-col h-full">
            <div class="px-6 py-5 border-b border-slate-200 block items-center">
                <h1 class="text-base font-semibold tracking-tight text-slate-900">AI Design Guide</h1>
                <p class="text-xs text-slate-500 mt-1">Documentation</p>
            </div>
            <div class="flex-1 overflow-y-auto p-4 space-y-1 text-sm font-medium text-slate-600" id="sidebar">
                <button id="nav-readme" class="sidebar-item active w-full text-left px-3 py-2 flex items-center gap-2 mb-2" onclick="loadContent('readme')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
                    README
                </button>
                {sidebar_content}
            </div>
        </div>

        <!-- Main Content -->
        <div class="flex-1 overflow-y-auto bg-white" id="main-content">
            <div class="px-8 py-10 lg:px-12">
                <div class="prose" id="content-container">
                    <!-- Content injected here -->
                </div>
            </div>
        </div>

        <script id="content-data" type="application/json">
{content_json}
        </script>

        <script>
            // Data loading securely
            const contentData = JSON.parse(document.getElementById('content-data').textContent);

            function loadContent(id) {
                // Update active state
                document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
                const activeEl = document.getElementById('nav-' + id);
                if(activeEl) activeEl.classList.add('active');

                // Intercept markdown file links
                let html = contentData[id] || '<h1>Content not found</h1>';
                
                // Replace basic markdown links to other pages with JS loads if we want, 
                // but for now just inject HTML
                document.getElementById('content-container').innerHTML = html;
                window.scrollTo(0,0);
            }

            function toggleFolder(folderId) {
                const btn = document.getElementById('folder-btn-' + folderId);
                const content = document.getElementById('folder-content-' + folderId);
                const expanded = btn.getAttribute('aria-expanded') === 'true';
                
                if (expanded) {
                    btn.setAttribute('aria-expanded', 'false');
                    content.style.display = 'none';
                } else {
                    btn.setAttribute('aria-expanded', 'true');
                    content.style.display = 'block';
                }
            }

            // Initial load
            loadContent('readme');
        </script>
    </body>
    </html>
    """

    markdown_ext = ['tables', 'fenced_code']
    content_map = {}
    sidebar_html = ""

    # SVG Icons
    folder_icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-500"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>'
    file_icon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-400"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>'
    chevron_icon = '<svg class="chevron ml-auto text-slate-400" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>'

    # Parse main files safely
    for fname in ["README.md", "COURSES.md", "GLOSSARY.md", "PATTERNS.md", "TRANSITION_GUIDE.md"]:
        if os.path.exists(fname):
            with open(fname, "r", encoding="utf-8") as f:
                html = markdown.markdown(f.read(), extensions=markdown_ext)
                key_name = fname.replace('.md', '').lower()
                content_map[key_name] = html
                if fname != "README.md":
                    sidebar_html += f'<button id="nav-{key_name}" class="sidebar-item w-full text-left px-3 py-2 flex items-center gap-2 mb-1" onclick="loadContent(\'{key_name}\')"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-500"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/></svg> {fname}</button>\n'

    sidebar_html += '<div class="h-4"></div>\n'

    # Fetch directories
    dirs = [d for d in os.listdir('.') if os.path.isdir(d) and d[0].isdigit()]
    dirs.sort()

    for idx, d in enumerate(dirs):
        dir_clean_name = d.replace('-', ' ').title()
        folder_id = f"folder_{idx}"
        
        # Collapsible folder button
        sidebar_html += f'''
        <button id="folder-btn-{folder_id}" class="folder-button w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-100 rounded-md transition-colors" aria-expanded="false" onclick="toggleFolder('{folder_id}')">
            {folder_icon}
            <span class="truncate">{dir_clean_name}</span>
            {chevron_icon}
        </button>
        <div id="folder-content-{folder_id}" class="folder-content pl-2 pr-1 mt-1 space-y-1 mb-2" style="display: none;">
        '''
        
        md_files = glob.glob(f"{d}/*.md")
        md_files.sort()
        
        for file_path in md_files:
            file_name_no_ext = os.path.basename(file_path).replace('.md', '')
            id_name = file_name_no_ext.replace('-', '_').replace(' ', '_')
            
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    md_text = f.read()
                    html = markdown.markdown(md_text, extensions=markdown_ext)
                    content_map[id_name] = html
                
                title = file_name_no_ext.replace('-', ' ').title()
                sidebar_html += f'''
                <button id="nav-{id_name}" class="sidebar-item w-full text-left px-3 py-1.5 flex items-center gap-2 text-slate-500 hover:text-slate-900" onclick="loadContent('{id_name}')">
                    {file_icon}
                    <span class="truncate">{title}</span>
                </button>
                '''
            except Exception as e:
                print(f"Error reading {file_path}: {e}")
                
        sidebar_html += '</div>\n'

    # JSON dump string safely wrapped in script tag
    content_json = json.dumps(content_map).replace('</script>', '<\\/script>')

    final_html = html_template.replace('{sidebar_content}', sidebar_html)
    final_html = final_html.replace('{content_json}', content_json)

    with open("index.html", "w", encoding="utf-8") as f:
        f.write(final_html)

    print("Website generated at index.html with Collapsible folders and strict Shadcn UI styling.")

if __name__ == "__main__":
    build_site()
