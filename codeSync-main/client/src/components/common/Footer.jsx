function Footer() {
    const currentYear = new Date().getFullYear();
    return (
        <footer className="static bottom-2 left-0 flex w-full justify-center text-sm text-gray-400 sm:fixed">
            <span>
                © {currentYear} CodeSync | Developed by{" "}
                <a
                    href=""
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                >
                    CodeSync
                </a>
            </span>
        </footer>
    );
}

export default Footer;
