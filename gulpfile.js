// 实现这个项目的构建任务
const { src, dest, series, parallel, watch } = require("gulp");
const plugins = require("gulp-load-plugins")();
const del = require("del");
const path = require("path");
const standard = require("standard");
const bs = require("browser-sync").create();

const config = {
  build: {
    src: "src",
    dist: "dist",
    temp: "temp",
    public: "public",
    paths: {
      html: "*.html",
      css: "assets/styles/*.scss",
      js: "assets/scripts/*.js",
      image: "assets/images/**",
      font: "assets/fonts/**",
    },
  },
  data: {
    menu: [{}, {}],
    pkg: require("./package.json"),
    date: new Date(),
  },
};

const clean = () => {
  return del([config.build.dist, config.build.temp]);
};

const lint = (done) => {
  const cwd = path.join(__dirname, config.build.src);
  standard.lintFiles(config.build.paths.js, { cwd, fix: true }, done);
};

const html = () => {
  return src(config.build.paths.html, {
    base: config.build.src,
    cwd: config.build.src,
  })
    .pipe(plugins.swig({ data: config.data }))
    .pipe(dest(config.build.temp));
};

const css = () => {
  return src(config.build.paths.css, {
    base: config.build.src,
    cwd: config.build.src,
  })
    .pipe(plugins.sass({ outputStyle: "expanded" }))
    .pipe(dest(config.build.temp));
};
const js = () => {
  return src(config.build.paths.js, {
    base: config.build.src,
    cwd: config.build.src,
  })
    .pipe(plugins.babel({ presets: ["@babel/preset-env"] }))
    .pipe(dest(config.build.temp));
};

const image = () => {
  return src(config.build.paths.image, {
    base: config.build.src,
    cwd: config.build.src,
  })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist));
};

const font = () => {
  return src(config.build.paths.font, {
    base: config.build.src,
    cwd: config.build.src,
  })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist));
};

const extra = () => {
  return src("**", { base: config.build.public }).pipe(dest(config.build.dist));
};

const useref = () => {
  return src(config.build.paths.html, {
    base: config.build.temp,
    cwd: config.build.temp,
  })
    .pipe(plugins.useref({ searchPath: [config.build.temp, ".", ".."] }))
    .pipe(
      plugins.if(
        /\.html$/,
        plugins.htmlmin({
          collapseWhitespace: true,
          minifyCSS: true,
          minifyJS: true,
        })
      )
    )
    .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
    .pipe(plugins.if(/\.js$/, plugins.uglify()))
    .pipe(dest(config.build.dist));
};

const devServer = () => {
  watch(config.build.paths.html, { cwd: config.build.src }, html);
  watch(config.build.paths.css, { cwd: config.build.src }, css);
  watch(config.build.paths.js, { cwd: config.build.src }, js);
  watch(
    [config.build.paths.image, config.build.paths.font],
    { cwd: config.build.src },
    bs.reload
  );
  watch("**", { cwd: config.build.public }, bs.reload);
  bs.init({
    notify: false,
    files: config.build.dist,
    server: {
      baseDir: [config.build.temp, config.build.src, config.build.public],
      routes: {
        "/node_modules": "node_modules",
      },
    },
  });
};

const distServer = () => {
  bs.init({
    notify: false,
    port: 2080,
    open: true,
    server: {
      baseDir: [config.build.dist],
    },
  });
};

const ghPages = () => {
  return src(config.build.dist).pipe(plugins.ghPages());
};

const compile = parallel(html, css, js);
const build = series(
  clean,
  parallel(series(compile, useref), image, font, extra)
);
const serve = series(compile, devServer);
const start = series(build, distServer);
const deploy = series(build, ghPages);

module.exports = { clean, lint, build, serve, start, deploy };
