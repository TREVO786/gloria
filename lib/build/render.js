const fse = require('fs-extra');

//@todo: let the user select their preferred template engine
const Handlebars = require('./handlebars-helpers');
var marked = require('marked');
const fm = require('front-matter');
const S = require(`string`);

const sass = require(`node-sass`);
const Render = {};
const root = process.cwd();

Render['.html'] = renderHtml;
Render['.md'] = renderMD;
Render.post = renderPost;
Render.extract = extract;
Render.layouts = {};
Render.partials = {};

Render.registerPartials = registerPartials;
Render.registerLayouts = registerLayouts;
Render.renderStyles = renderStyles;


function renderStyles(item, dest) {
    let result = extract(item);
    console.log(`${root}/${item.basePath}`);
    result.css = sass.renderSync({
        data: result.content,
        includePaths: [`${root}/${item.basePath}`],
    });
    return result;
}

function registerPartials(files) {
    Render.partials = Handlebars.registerPartials(files);
}

function registerLayouts(files) {
    for (var k in files) {
        if (files[k].name.match('.html') === null) {
            return;
        }

        files[k].content = fse.readFileSync(files[k].path, `utf-8`);
        Render.layouts[k] = files[k];
    }

    return Render.layouts;
}

function extract(file) {
    let content = ``;
    try {
        content = fse.readFileSync(file.path, `utf-8`);
    } catch (err) {
        if (err) throw err;
    }

    content = fm(content);
    let destination = {
        folder: file.basePath,
        file: file.name,
    };

    return {
        destination: destination,
        content: content.body,
        fm: content.attributes,
    };
}

function renderHtml(page, data) {
    data.page = page.data;
    return renderCommon(page, page.content, data);
}

function renderMD(page, data) {
    data.page = page.data;
    let html = marked(page.content);
    return renderCommon(page, html, data);
}

function renderPost(page, data) {
    let result = {};
    let html = marked(page.content);
    data.page = page.data;
    data.page.url = page.data.url;
    result = renderCommon(page, html, data);
    result.destination.folder = `${page.data.url}/`;
    return result;
}

function renderCommon(page, content, data) {
    let template = Handlebars.compile(content);
    let result = template(data);
    let newname = (page.name || ``).replace(/\.md$/, '.html');
    let destination = {
        folder: page.basePath,
        file: newname,
    };
    if (newname !== 'index.html') {
        destination.folder = `${page.basePath}${page.name.replace('.html', '')}`;
        destination.file = `index.html`;
    }

    if (data.page.url) {
        destination.folder = `${page.basePath}${data.page.url}/`;
        page.name = 'index.html';
    }

    data.page.content = result;
    let layoutName = page.data.layout || `default`;
    if (Render.layouts[layoutName]) {
        template = Handlebars.compile(Render.layouts[layoutName].content);
        result = template(data);
    }

    return {
        destination: destination,
        content: result,
    };
}

module.exports = Render;
