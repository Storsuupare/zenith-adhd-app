

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: ContractStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ContractStatus" AS ENUM (
    'IN_PROGRESS',
    'SUCCESS',
    'FAILED',
    'ABORTED'
);


--
-- Name: item_rarity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.item_rarity AS ENUM (
    'junk',
    'uncommon',
    'rare',
    'epic',
    'legendary',
    'mythic',
    'Mythic',
    'Legendary',
    'Epic',
    'Rare',
    'Uncommon',
    'Common',
    'Junk'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id integer NOT NULL,
    title text NOT NULL,
    duration_minutes numeric NOT NULL,
    stake_amount integer NOT NULL,
    status text DEFAULT 'ACTIVE'::text,
    deadline timestamp with time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id character varying(255),
    skill_id integer,
    rarity_tier integer DEFAULT 1,
    credit_reward integer DEFAULT 50,
    xp_reward integer DEFAULT 100,
    is_failed boolean DEFAULT false,
    estimated_minutes integer DEFAULT 15,
    sub_tasks jsonb DEFAULT '[]'::jsonb,
    completed_at timestamp with time zone,
    last_ping timestamp without time zone DEFAULT now(),
    start_time timestamp without time zone DEFAULT now(),
    "skillId" integer,
    "cognitiveLoad" integer DEFAULT 0 NOT NULL
);


--
-- Name: contracts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contracts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contracts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contracts_id_seq OWNED BY public.tasks.id;


--
-- Name: daily_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_stats (
    id integer NOT NULL,
    user_id integer NOT NULL,
    date date NOT NULL,
    focus_minutes integer DEFAULT 0 NOT NULL
);


--
-- Name: daily_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.daily_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: daily_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.daily_stats_id_seq OWNED BY public.daily_stats.id;


--
-- Name: inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id integer,
    perk_id text,
    name character varying(255),
    rarity character varying(50) DEFAULT 'common'::character varying,
    category character varying(50),
    is_equipped boolean DEFAULT false,
    acquired_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    description text,
    color_hex character varying(10),
    effect_value text
);


--
-- Name: learning_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.learning_modules (
    id integer NOT NULL,
    subject character varying(255) NOT NULL,
    topic text,
    tier integer DEFAULT 1,
    duration integer NOT NULL
);


--
-- Name: learning_modules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.learning_modules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: learning_modules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.learning_modules_id_seq OWNED BY public.learning_modules.id;


--
-- Name: perks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.perks (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    rarity character varying(20) NOT NULL,
    drop_chance numeric(6,4) NOT NULL,
    category character varying(50) DEFAULT 'Perk'::character varying NOT NULL,
    description text,
    effect_value character varying(100),
    color_hex character varying(10),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: perks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.perks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: perks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.perks_id_seq OWNED BY public.perks.id;


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    endpoint text NOT NULL,
    subscription jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: push_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.push_subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: push_subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.push_subscriptions_id_seq OWNED BY public.push_subscriptions.id;


--
-- Name: skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skills (
    id integer NOT NULL,
    name character varying(100) NOT NULL
);


--
-- Name: skills_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skills_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skills_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skills_id_seq OWNED BY public.skills.id;


--
-- Name: system_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_modules (
    id integer NOT NULL,
    owner_id integer,
    module_name character varying(100),
    module_type character varying(50),
    is_installed boolean DEFAULT false
);


--
-- Name: system_modules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_modules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_modules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_modules_id_seq OWNED BY public.system_modules.id;


--
-- Name: user_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id integer,
    perk_id text,
    obtained_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_equipped boolean DEFAULT false
);


--
-- Name: user_skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_skills (
    id integer NOT NULL,
    user_id integer NOT NULL,
    skill_id integer NOT NULL,
    xp integer DEFAULT 0,
    level integer DEFAULT 1,
    next_level_xp integer DEFAULT 500,
    prestige_level integer DEFAULT 0,
    last_earned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    prestige_boost_until timestamp with time zone
);


--
-- Name: user_skills_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_skills_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_skills_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_skills_id_seq OWNED BY public.user_skills.id;


--
-- Name: user_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_stats (
    id integer NOT NULL,
    level integer DEFAULT 1,
    current_xp integer DEFAULT 0,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_stats_id_seq OWNED BY public.user_stats.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    external_id character varying(255),
    xp integer DEFAULT 0,
    level integer DEFAULT 1,
    streak integer DEFAULT 0,
    role text DEFAULT 'FREE'::text,
    essence integer DEFAULT 500,
    email_address text,
    username character varying(255),
    total_xp integer DEFAULT 0,
    current_level integer DEFAULT 1,
    system_version integer DEFAULT 1,
    experience_data integer DEFAULT 0,
    system_credits integer DEFAULT 0,
    last_reboot timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    account_tier integer DEFAULT 0,
    cognitive_load integer DEFAULT 1,
    strikes integer DEFAULT 0,
    last_strike_timestamp timestamp without time zone,
    penalty_until timestamp without time zone,
    current_streak integer DEFAULT 0,
    last_mission date,
    bw_capacity_level integer DEFAULT 0 NOT NULL,
    bw_refill_count integer DEFAULT 0 NOT NULL,
    bw_refill_date date,
    streak_last_updated timestamp with time zone DEFAULT now(),
    is_admin boolean DEFAULT false,
    daily_bonus_claimed_at timestamp with time zone,
    has_seen_onboarding boolean DEFAULT false,
    purchased_cosmetics jsonb DEFAULT '[]'::jsonb,
    first_task_completed boolean DEFAULT false NOT NULL,
    is_banned boolean DEFAULT false NOT NULL,
    ban_reason text,
    daily_challenge_claimed_date date
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: daily_stats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_stats ALTER COLUMN id SET DEFAULT nextval('public.daily_stats_id_seq'::regclass);


--
-- Name: learning_modules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_modules ALTER COLUMN id SET DEFAULT nextval('public.learning_modules_id_seq'::regclass);


--
-- Name: perks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perks ALTER COLUMN id SET DEFAULT nextval('public.perks_id_seq'::regclass);


--
-- Name: push_subscriptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.push_subscriptions_id_seq'::regclass);


--
-- Name: skills id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills ALTER COLUMN id SET DEFAULT nextval('public.skills_id_seq'::regclass);


--
-- Name: system_modules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_modules ALTER COLUMN id SET DEFAULT nextval('public.system_modules_id_seq'::regclass);


--
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.contracts_id_seq'::regclass);


--
-- Name: user_skills id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_skills ALTER COLUMN id SET DEFAULT nextval('public.user_skills_id_seq'::regclass);


--
-- Name: user_stats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_stats ALTER COLUMN id SET DEFAULT nextval('public.user_stats_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: tasks contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: daily_stats daily_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_stats
    ADD CONSTRAINT daily_stats_pkey PRIMARY KEY (id);


--
-- Name: daily_stats daily_stats_user_date_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_stats
    ADD CONSTRAINT daily_stats_user_date_unique UNIQUE (user_id, date);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- Name: learning_modules learning_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_modules
    ADD CONSTRAINT learning_modules_pkey PRIMARY KEY (id);


--
-- Name: perks perks_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perks
    ADD CONSTRAINT perks_name_key UNIQUE (name);


--
-- Name: perks perks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perks
    ADD CONSTRAINT perks_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: skills skills_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_name_key UNIQUE (name);


--
-- Name: skills skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (id);


--
-- Name: system_modules system_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_modules
    ADD CONSTRAINT system_modules_pkey PRIMARY KEY (id);


--
-- Name: users unique_external_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT unique_external_id UNIQUE (external_id);


--
-- Name: user_items user_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_items
    ADD CONSTRAINT user_items_pkey PRIMARY KEY (id);


--
-- Name: user_skills user_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_skills
    ADD CONSTRAINT user_skills_pkey PRIMARY KEY (id);


--
-- Name: user_skills user_skills_user_id_skill_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_skills
    ADD CONSTRAINT user_skills_user_id_skill_id_key UNIQUE (user_id, skill_id);


--
-- Name: user_stats user_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_stats
    ADD CONSTRAINT user_stats_pkey PRIMARY KEY (id);


--
-- Name: users users_external_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_external_id_key UNIQUE (external_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: daily_stats_user_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX daily_stats_user_date_idx ON public.daily_stats USING btree (user_id, date DESC);


--
-- Name: tasks contracts_skill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT contracts_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skills(id);


--
-- Name: daily_stats daily_stats_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_stats
    ADD CONSTRAINT daily_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: inventory inventory_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: system_modules system_modules_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_modules
    ADD CONSTRAINT system_modules_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: user_items user_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_items
    ADD CONSTRAINT user_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_skills user_skills_skill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_skills
    ADD CONSTRAINT user_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skills(id) ON DELETE CASCADE;


--
-- Name: user_skills user_skills_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_skills
    ADD CONSTRAINT user_skills_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--


