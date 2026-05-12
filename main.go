package main

import (
	"database/sql"
	"encoding/json"
	"html/template"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	_ "modernc.org/sqlite"
)

type Server struct {
	db           *sql.DB
	templatesDir string
	dev          bool
	tplCache     map[string]*template.Template
	tplMu        sync.RWMutex
}

type Project struct {
	ID          int64     `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	URL         string    `json:"url,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

type PageData struct {
	Page string
}

func main() {
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "/data/portfolio.db"
	}

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer db.Close()

	if err := initSchema(db); err != nil {
		log.Fatalf("init schema: %v", err)
	}

	templatesDir := os.Getenv("TEMPLATES_DIR")
	if templatesDir == "" {
		templatesDir = "/app/templates"
	}
	staticDir := os.Getenv("STATIC_DIR")
	if staticDir == "" {
		staticDir = "/app/static"
	}

	s := &Server{
		db:           db,
		templatesDir: templatesDir,
		dev:          os.Getenv("DEV") == "1",
		tplCache:     map[string]*template.Template{},
	}

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(15 * time.Second))

	r.Get("/healthz", s.health)
	r.Get("/api/projects", s.listProjects)

	fs := http.StripPrefix("/static/", http.FileServer(http.Dir(staticDir)))
	r.Handle("/static/*", fs)

	pages := []string{"home", "about", "members", "tracks", "shows", "contact"}
	for _, p := range pages {
		page := p
		path := "/" + page
		if page == "home" {
			path = "/"
		}
		r.Get(path, func(w http.ResponseWriter, req *http.Request) {
			s.renderPage(w, req, page)
		})
	}

	r.NotFound(func(w http.ResponseWriter, req *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		s.renderPage(w, req, "home")
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("listening on :%s (dev=%v)", port, s.dev)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal(err)
	}
}

func (s *Server) renderPage(w http.ResponseWriter, _ *http.Request, page string) {
	tpl, err := s.template(page)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if err := tpl.ExecuteTemplate(w, "base", PageData{Page: page}); err != nil {
		log.Printf("render %s: %v", page, err)
	}
}

func (s *Server) template(page string) (*template.Template, error) {
	if !s.dev {
		s.tplMu.RLock()
		t, ok := s.tplCache[page]
		s.tplMu.RUnlock()
		if ok {
			return t, nil
		}
	}
	t, err := template.ParseFiles(
		filepath.Join(s.templatesDir, "base.html"),
		filepath.Join(s.templatesDir, page+".html"),
	)
	if err != nil {
		return nil, err
	}
	if !s.dev {
		s.tplMu.Lock()
		s.tplCache[page] = t
		s.tplMu.Unlock()
	}
	return t, nil
}

func initSchema(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS projects (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL,
			description TEXT NOT NULL,
			url TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
	`)
	return err
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	if err := s.db.Ping(); err != nil {
		http.Error(w, "db down", http.StatusServiceUnavailable)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) listProjects(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.QueryContext(r.Context(),
		`SELECT id, title, description, COALESCE(url, ''), created_at FROM projects ORDER BY created_at DESC`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	out := []Project{}
	for rows.Next() {
		var p Project
		if err := rows.Scan(&p.ID, &p.Title, &p.Description, &p.URL, &p.CreatedAt); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		out = append(out, p)
	}
	writeJSON(w, http.StatusOK, out)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
