{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Node.js
            nodejs_24

            # CLI tools
            fzf
            just
            gh
          ];

          shellHook = ''
            echo ""
            echo "███████╗ ██████╗ ██████╗ ███╗   ███╗ █████╗ "
            echo "██╔════╝██╔═══██╗██╔══██╗████╗ ████║██╔══██╗"
            echo "█████╗  ██║   ██║██████╔╝██╔████╔██║███████║"
            echo "██╔══╝  ██║   ██║██╔══██╗██║╚██╔╝██║██╔══██║"
            echo "██║     ╚██████╔╝██║  ██║██║ ╚═╝ ██║██║  ██║"
            echo "╚═╝      ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝"
            echo ""
            echo "Declarative forms with FEEL expressions"
            echo ""
            echo "Node.js $(node --version) | npm $(npm --version)"
            echo ""
          '';
        };
      }
    );
}
